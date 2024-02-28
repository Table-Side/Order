import passport from 'passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request, Response, NextFunction } from 'express';
import { appConfig } from '../config/app';

// Define your JWT options
const jwtOptions = {
    secretOrKey: appConfig.JWT_SECRET,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

// Create a new JWT strategy
const jwtStrategy = new Strategy(jwtOptions, (payload, done) => {
    // You can customize the JWT verification logic here
    // For example, you can check if the user exists in your database
    // and call `done(null, user)` if the user is valid, or `done(null, false)` otherwise
    done(null, payload);
});

// Use the JWT strategy with Passport
passport.use(jwtStrategy);

// Create a middleware function to validate the JWT
const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // If the JWT is valid, you can access the user object in subsequent middleware or routes
        req.user = user;
        next();
    })(req, res, next);
};

export default authenticateJWT;