import { Request } from "express";

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
        name: string;
        email: string;
        verified: boolean;
        realm_access: {
            roles: string[];
        }
    }
}

export default AuthenticatedRequest;
