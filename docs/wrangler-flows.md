## End-to-end Data Wrangler flow
```mermaid
flowchart LR
    A[Std user in Web Wrangler\nsees issue] --> B[Create debug snapshot\n(data snippet + pipeline + test)]
    B --> C[Power user in VS Code\nSync toolbox]
    C --> D[Run failing test\nreproduce issue]
    D --> E[Fix module\nadd test]
    E --> F[Push PR\nCI runs tests]
    F --> G[Tag new version\npublish artifact]
    G --> H[Wrangler imports new toolbox\npin via toolbox.lock]
    H --> I[Std user re-run\nissue resolved]
```


