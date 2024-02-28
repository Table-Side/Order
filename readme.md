# Tableside: Order Service

A microservice component for item ordering.

Powered by [Express.js](), [Passport.js](https://www.passportjs.org/) and [Prisma](https://www.prisma.io)

## Purpose

Enables item ordering for an outlet.

## API Endpoints

### POST /new
Starts a new order

#### Request Body
```json
{
    TODO
}
```

#### Response Body
```json
{
    TODO
}
```

### PUT /:orderId/add
Adds an item to the order

#### Request Body
```json
{
    TODO
}
```

#### Response Body
```json
{
    TODO
}
```

### PATCH /:orderId/updateQuantity
Update the quantity for a specific item

#### Request Body
```json
{
    TODO
}
```

#### Response Body
```json
{
    TODO
}
```

### DELETE /:orderId/remove
Removes an item from an order

#### Request Body
```json
{
    TODO
}
```

#### Response Body
```json
{
    TODO
}
```

### DELETE /:orderId/abandon
Abandon an order

#### Request Body
```json
{
    TODO
}
```

#### Response Body
```json
{
    TODO
}
```

### GET /:orderId
Fetch the details of an order.

#### Request Body
```json
{
    TODO
}
```

#### Response Body
```json
{
    TODO
}
```

### GET /active
Get the current order for the user.

#### Request Body
```json
{
    TODO
}
```

#### Response Body
```json
{
    TODO
}
```

### GET /history
Get the user's order history.

#### Request Body
```json
{
    TODO
}
```

#### Response Body
```json
{
    TODO
}
```

## .env Configuration
```dotenv
# -- DB -- #
POSTGRES_USER="<GENERATE_THIS>"
POSTGRES_PASSWORD="<GENERATE_THIS>"
POSTGRES_DB="tableside_users"

# -- PG ADMIN -- #
PGADMIN_DEFAULT_EMAIL="admin@surrey.ac.uk"
PGADMIN_DEFAULT_PASSWORD="password"

# -- APP -- #
DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@database:5432/${POSTGRES_DB}?schema=public"
JWT_SECRET="<GENERATE_THIS>"

```