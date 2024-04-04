import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces';

const isAuthenticated = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        res.status(401).json({
            error: {
                message: "Unauthorized",
                details: "JWT supplied is missing user information"
            }
        });
        return;
    }
    next();
}

export default isAuthenticated;