import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces';

const restaurantExists = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { restaurantId } = req.body;

    const restaurant = await fetch(`${process.env.RESTAURANT_SERVICE_URL}/internal/restaurant/exists?id=${restaurantId}`)
    if (!restaurant.ok) {
        res.status(404).json({
            error: {
                message: "Restaurant not found"
            }
        });
        return;
    }
    
    next();
}

export default restaurantExists;