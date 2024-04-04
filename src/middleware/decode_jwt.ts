import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../interfaces';

const decodeJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.decode(token, { json: true });

            if (!decoded) {
                return res.status(401).json({
                    error: {
                        message: 'Invalid JWT token provided',
                        details: 'Token could not be decoded'
                    }
                });
            }

            req.user = {
                sub: decoded.sub,
                name: decoded.name,
                email: decoded.email,
                verified: decoded.verified,
                realm_access: {
                    roles: decoded.realm_access.roles
                }
            }
        } catch (error) {
            return res.status(401).json({
                error: {
                    message: 'Invalid JWT token provided',
                    details: error
                }
            });
        }
    }

    next();
};

export default decodeJWT;