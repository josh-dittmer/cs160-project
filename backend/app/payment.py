import stripe

# Payment utilities

def create_stripe_customer(email: str):
    customer = stripe.Customer.create(
        email=email
    )
    return customer