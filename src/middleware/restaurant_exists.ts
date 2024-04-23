import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces';

const restaurantExists = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { restaurantId } = req.body;

    const restaurant = await fetch(`http://${process.env.RESTAURANT_SERVICE_URL ?? 'restaurant:3000'}/internal/restaurant/exists?id=${restaurantId}`, {
        headers: {
            "X-Request-From": "tableside-order"
        }
    })
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