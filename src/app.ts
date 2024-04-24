import express, { NextFunction, Request, Response } from 'express';

import * as middleware from "./middleware";

import * as routers from "./routes";

class App {
    private server;

    constructor() {
        this.server = express();

        this.middlewares();
        this.routes();
    }

    middlewares() {
        // JSON
        this.server.use(express.json());

        // Error handling
        this.server.use((err: any, req: Request, res: Response, next: NextFunction) => {
            console.error(err.stack);
            res.status(500).send('Unknown error occurred!');
            next();
        });

        // Request Logging (console)
        this.server.use((req: Request, res: Response, next: NextFunction) => {
            console.log(`Request received: ${req.method} ${req.url}`);
            next();
        });
        
        // JWT Decode
        this.server.use(middleware.decodeJWT);
    }

    routes() {
        // User specific routes
        this.server.use("/orders", routers.user)
        
        // Order routes
        this.server.use("/orders", routers.order);

        // Internal routes
        this.server.use("/", routers.internal);

        // 404
        this.server.use((req: Request, res: Response, next: NextFunction) => {
            return res.status(404).send({
                error: {
                    code: 404,
                    message: "Route Not Found",
                    uri: req.originalUrl,
                }
            });
        });
    }

    listen(port: number | string, callback: () => void) {
        this.server.listen(port, callback);
    }
}

export default new App();