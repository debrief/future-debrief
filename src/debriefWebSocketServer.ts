import * as vscode from 'vscode';
import * as WebSocket from 'ws';
import * as http from 'http';

interface DebriefMessage {
    command: string;
    params?: any;
}

interface DebriefResponse {
    result?: any;
    error?: {
        message: string;
        code: number;
    };
}

export class DebriefWebSocketServer {
    private server: WebSocket.WebSocketServer | null = null;
    private httpServer: http.Server | null = null;
    private readonly port = 60123;
    private clients: Set<WebSocket> = new Set();

    constructor() {}

    async start(): Promise<void> {
        try {
            // Create HTTP server first to handle port conflicts
            this.httpServer = http.createServer();
            
            // Handle port conflicts
            this.httpServer.on('error', (error: any) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`Port ${this.port} is already in use`);
                    vscode.window.showErrorMessage(
                        `WebSocket server port ${this.port} is already in use. Please close other applications using this port.`
                    );
                }
                throw error;
            });
            
            await new Promise<void>((resolve, reject) => {
                this.httpServer!.listen(this.port, 'localhost', () => {
                    console.log(`HTTP server listening on port ${this.port}`);
                    resolve();
                });
                this.httpServer!.on('error', reject);
            });

            // Create WebSocket server
            this.server = new WebSocket.WebSocketServer({ 
                server: this.httpServer,
                path: '/'
            });

            this.server.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
                console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);
                this.clients.add(ws);

                // Set up message handling
                ws.on('message', async (data: Buffer) => {
                    try {
                        const message = data.toString();
                        console.log('Received message:', message);
                        
                        // Try to parse as JSON
                        let response: DebriefResponse;
                        
                        try {
                            const parsedMessage: DebriefMessage = JSON.parse(message);
                            response = await this.handleCommand(parsedMessage);
                        } catch (jsonError) {
                            // If not valid JSON, treat as raw message (for backward compatibility)
                            response = { result: `Echo: ${message}` };
                        }
                        
                        ws.send(JSON.stringify(response));
                    } catch (error) {
                        console.error('Error handling message:', error);
                        const errorResponse: DebriefResponse = {
                            error: {
                                message: error instanceof Error ? error.message : 'Unknown error',
                                code: 500
                            }
                        };
                        ws.send(JSON.stringify(errorResponse));
                    }
                });

                ws.on('close', () => {
                    console.log('WebSocket client disconnected');
                    this.clients.delete(ws);
                });

                ws.on('error', (error) => {
                    console.error('WebSocket client error:', error);
                    this.clients.delete(ws);
                });

                // Send welcome message
                ws.send(JSON.stringify({ result: 'Connected to Debrief WebSocket Bridge' }));
            });

            this.server.on('error', (error) => {
                console.error('WebSocket server error:', error);
                vscode.window.showErrorMessage(`WebSocket server error: ${error.message}`);
            });

            console.log(`Debrief WebSocket server started on ws://localhost:${this.port}`);
            vscode.window.showInformationMessage(`Debrief WebSocket bridge started on port ${this.port}`);

        } catch (error) {
            console.error('Failed to start WebSocket server:', error);
            vscode.window.showErrorMessage(`Failed to start WebSocket server: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

    async stop(): Promise<void> {
        console.log('Stopping Debrief WebSocket server...');

        // Close all client connections
        this.clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        });
        this.clients.clear();

        // Close WebSocket server
        if (this.server) {
            await new Promise<void>((resolve) => {
                this.server!.close(() => {
                    console.log('WebSocket server closed');
                    resolve();
                });
            });
            this.server = null;
        }

        // Close HTTP server
        if (this.httpServer) {
            await new Promise<void>((resolve) => {
                this.httpServer!.close(() => {
                    console.log('HTTP server closed');
                    resolve();
                });
            });
            this.httpServer = null;
        }

        console.log('Debrief WebSocket server stopped');
    }

    isRunning(): boolean {
        return this.server !== null && this.httpServer !== null;
    }

    private async handleCommand(message: DebriefMessage): Promise<DebriefResponse> {
        console.log(`Handling command: ${message.command}`);

        try {
            switch (message.command) {
                case 'notify':
                    return await this.handleNotifyCommand(message.params);
                    
                default:
                    return {
                        error: {
                            message: `Unknown command: ${message.command}`,
                            code: 400
                        }
                    };
            }
        } catch (error) {
            console.error(`Error handling command ${message.command}:`, error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Command execution failed',
                    code: 500
                }
            };
        }
    }

    private async handleNotifyCommand(params: any): Promise<DebriefResponse> {
        if (!params || typeof params.message !== 'string') {
            return {
                error: {
                    message: 'notify command requires a "message" parameter of type string',
                    code: 400
                }
            };
        }

        try {
            // Display VS Code notification
            vscode.window.showInformationMessage(params.message);
            
            console.log(`Displayed notification: "${params.message}"`);
            
            return { result: null };
        } catch (error) {
            console.error('Error displaying notification:', error);
            return {
                error: {
                    message: 'Failed to display notification',
                    code: 500
                }
            };
        }
    }
}