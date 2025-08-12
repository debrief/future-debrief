## Import-Wrangling Process

```mermaid
sequenceDiagram
    autonumber
    participant S as Source (file/feed)
    participant I as Import Service
    participant D as Ingest DB
    participant W as Data Wrangler
    participant ST as STAC Store
    participant G as Gantt Availability Index

    S->>I: Provide raw data (file, API, feed)
    I->>D: Store raw object metadata + state=captured
    I->>W: Pass storage URL + metadata

    W->>W: Run pipeline (validation + transforms)
    alt Low-touch & clean
        W->>ST: Publish wrangled output(s) to STAC
        W->>D: Update ingest_item state=published, add stac_item_url(s)
        ST->>G: Trigger availability index update (per output)
    else Low-touch with errors/warnings over threshold
        W->>D: Update ingest_item state=needs_review
        Note over D: Item appears in Ingest Dashboard<br/>Needs Review queue
    else High-touch (manual review required)
        W->>D: Update ingest_item state=needs_review
    end

    Note over G: Index pre-aggregates 15-min buckets<br/>per platform from published STAC Items

    User->>G: View Gantt (15-min buckets per platform)
    User->>G: Click amber/red bucket
    G->>D: Lookup related ingest_item / wrangle_output
    G->>W: Launch Wrangler scoped to platform+time
```


## High-touch review loop (for ingests that require human input)
```mermaid
sequenceDiagram
    autonumber
    participant U as Analyst
    participant B as Ingest Dashboard
    participant DB as Import DB (state+locks)
    participant W as Data Wrangler (Web)
    participant ST as STAC Store
    participant G as Gantt Index

    %% Claim & open
    U->>B: Click "Needs Review" item
    B->>DB: LOCK request (set locked_by, lock_expires_at, state=in_review)
    DB-->>B: 200 OK (lock granted)
    B-->>U: Deep link to Wrangler (signed token + raw_object_id)
    U->>W: Open Wrangler via deep link

    %% Load & heartbeat
    W->>DB: GET ingest_item + storage_url + hints
    W->>W: Load raw bytes, verify sha256
    loop While in review
        W->>DB: HEARTBEAT (extend lock_expires_at)
    end

    %% Review actions
    W->>W: Run pipeline (validate, suggest fixes)
    U->>W: Accept/reject fixes, optional Python rule
    W->>W: Build correction ledger + validation report (draft)

    alt Publish
        W->>ST: Write wrangled FeatureCollection asset(s)
        ST-->>W: Asset URL(s) / Item URL(s)
        W->>DB: UPDATE wrangle_output + ingest_item (state=published, stac_item_url(s))
        ST->>G: Trigger availability update (15-min buckets)
        W->>DB: UNLOCK (clear locked_by, lock_expires_at)
    else Park (defer)
        W->>DB: UPDATE ingest_item (state=parked)
        W->>DB: UNLOCK
    else Error
        W->>DB: UPDATE ingest_item (state=error, message)
        W->>DB: UNLOCK
    else Cancel/Close without changes
        W->>DB: UPDATE ingest_item (state=needs_review)
        W->>DB: UNLOCK
    end

    %% Lock expiry safety
    Note over DB: If now() > lock_expires_at<br/>auto-clear lock and revert to needs_review
```

## Import pipeline states

### Ingest item (parent)
```mermaid
stateDiagram-v2
    [*] --> captured : import()
    captured --> auto_wrangling : route(low_touch)
    captured --> needs_review : route(high_touch)
    auto_wrangling --> published : clean
    auto_wrangling --> needs_review : warns>threshold or errors
    needs_review --> in_review : claim/lock
    in_review --> published : publish()
    in_review --> needs_review : cancel/close
    in_review --> parked : park()
    in_review --> error : fail()
    parked --> needs_review : resume()
    published --> [*]
    error --> [*]
```

### Wrangler output (child per platform/day)
```mermaid
stateDiagram-v2
    [*] --> queued : discovered(entity_key,day)
    queued --> wrangling : start()
    wrangling --> published : clean
    wrangling --> in_review : warns>threshold or errors
    in_review --> published : publish()
    in_review --> parked : park()
    in_review --> error : fail()
    parked --> in_review : resume()
    published --> [*]
    error --> [*]
```

Legend (concise):
*	clean = validation passes within thresholds → straight‑through
* warns>threshold / errors = gated to Needs Review.
* park() = defer without publishing; resume() returns to review.
* Locks/timeouts handled outside the diagram (as per the sequence flow you approved).

### Twin pipelines
```mermaid
flowchart LR
    subgraph Import["Import Stage"]
        I[Import Service\n(capture raw file + metadata)]
        IP[Ingest Pipeline\n(parse, normalise, validate, enrich, split)]
    end

    subgraph Storage["Data Store"]
        STAC[STAC Store\n(wrangled FeatureCollections + metadata)]
    end

    subgraph Analysis["Analysis Stage"]
        AP[Analysis Pipeline\n(derive, calculate, model, visualise)]
        OUT[Outputs\n(reports, dashboards, derived datasets)]
    end

    I --> IP
    IP -- Clean --> STAC
    IP -- Errors/Warnings -->|Needs Review| IP
    STAC --> AP
    AP --> STAC
    AP --> OUT
```