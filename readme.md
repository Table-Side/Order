# Tableside: Order Service

A microservice component for item ordering.

## Models

### Order

- `id` (**`String`**): UUID of the Order.
- `createdAt` (**`DateTime`**):  Date and time of when the Order was created.
- `updatedAt` (**`DateTime`**): Date and time of when the Order was last updated.
- `forUser` (**`String`**): UUID of the user's Keycloak identifier.
- `forRestaurant` (**`String`**): The UUID of the [**Restaurant**](https://github.com/Table-Side/Restaurant#Restaurant)
- `items` (**`Array<OrderItem>`**): An array of ordered items as [**OrderItem**](#orderitem) objects.
- `transaction` (**`Transaction`**): Reference to the transaction for this order. _Optional_ until transaction completed.

### OrderItem

- `id` (**`String`**): UUID of the OrderItem.
- `createdAt` (**`DateTime`**): Date and time of when the OrderItem was created.
- `updatedAt` (**`DateTime`**): Date and time of when the OrderItem was last updated.
- `itemId` (**`String`**): The UUID of the [**Item**](https://github.com/Table-Side/Restaurant#Item) from the Restaurant microservice.
- `quantity` (**`String`**): The quantity of the ordered item.
- `price` (**`Decimal`**): The price of the ordered item for a single unit.
- `orderId` (**`String`**): The UUID of the [**Order**](#order) this order item belongs to.
- `order` (**`Order`**): Reference to the order object this order item belongs to.

### Transaction

- `id` (**`String`**): UUID of the Transaction.
- `createdAt` (**`DateTime`**): Date and time of when the Transaction was created.
- `updatedAt` (**`DateTime`**): Date and time of when the Transaction was last updated.
- `currency` (**`String`**): The currency code for the transaction. Defaults to GBP.
- `amount` (**`Float`**): The transaction total.
- `orderId` (**`String`**): The UUID of the [**Order**](#order) this transaction belongs to.
- `order` (**`Order`**): Reference to the order object this transaction belongs to.

## API Routes

### Order

Manage an order.

- **POST** `/new`: Create a new order

    - **Example Request**:
    
    ```json
    {
        "restaurantId": "84d3bedb-9659-4ae4-b8ef-7486483887e7"
    }
    ```

    - **Example Response** (200: OK):

    ```json
    {
        "data": {
            "id": "1556b269-357a-4677-a4cc-5f8efd6023d8",
            "createdAt": "2024-04-23T17:10:01.605Z",
            "updatedAt": "2024-04-23T17:10:01.605Z",
            "forUser": "f76e0e78-4970-41ad-b35f-d0f8510a6b81",
            "forRestaurant": "84d3bedb-9659-4ae4-b8ef-7486483887e7"
        }
    }
    ```

- **GET** `/:orderId`: Get an order by its ID

    - **Example Response** (200: OK):

    ```json
    {
        "data": {
            "id": "1556b269-357a-4677-a4cc-5f8efd6023d8",
            "createdAt": "2024-04-23T17:10:01.605Z",
            "updatedAt": "2024-04-23T17:10:01.605Z",
            "forUser": "f76e0e78-4970-41ad-b35f-d0f8510a6b81",
            "forRestaurant": "84d3bedb-9659-4ae4-b8ef-7486483887e7"
        }
    }
    ```

- **PUT** `/:orderId/add`: Add an item to an order

    - **Sample Request**

    ```json
    {
        "itemId": "9ac378bb-95ff-4f6e-b130-e1980ce15416",
        "quantity": 1
    }
    ```

    - **Sample Response**

    ```json

    ```

- **PATCH** `/:orderId/updateQuantity`: Update an item's quantity

    - **Sample Request**

    ```json
    {
        "orderItemId": "",
        "quantity": 5
    }
    ```

- **DELETE** `/:orderId/remove`: Remove an item from an order

    - **Sample Request**
    
    ```json
    {
        "orderItemId": ""
    }
    ```

- **GET** `/active`: Get a user's current/active order

- **GET** `/history`: Get a user's order history

### Order Actions

Actions to modify the order state.

- **DELETE** `/:orderId/abandon`: Abandon an order. Must be the user that started the order

- **POST** `/:orderId/checkout`: Submit an order. Must be the user that started the order

### Internal 

Routes to be called by other microservices within the trusted network.

- **GET** `/:orderId`: Get an order by its ID






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