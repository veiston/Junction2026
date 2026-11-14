"""Display labels and fixed orderings for the understand slice (docs/er.md §4)."""

from __future__ import annotations

from contracts.dto.common import Basket

BASKET_ORDER: tuple[Basket, ...] = (Basket.mandatory_regular, Basket.mandatory_irregular, Basket.everyday)

BASKET_LABELS: dict[str, str] = {
    "mandatory_regular": "Mandatory & regular",
    "mandatory_irregular": "Mandatory & irregular",
    "everyday": "Everyday",
}

# spend_group -> label, from the MCC reference table (docs/er.md §4.1 and §4.2).
SPEND_GROUP_LABELS: dict[str, str] = {
    "housing": "Rent / housing",
    "utilities": "Utilities",
    "supermarkets": "Supermarkets",
    "butchers": "Butchers",
    "dairy": "Dairy shops",
    "public_transport": "Public transport",
    "fuel": "Fuel",
    "pharmacy": "Pharmacy",
    "doctors": "Doctors",
    "dentists": "Dentists",
    "health_services": "Health services",
    "home_supplies": "Home supplies",
    "hardware": "Hardware",
    "furniture_appliances": "Furniture & appliances",
    "electronics": "Electronics",
    "software_apps": "Software & apps",
    "kiosks": "Kiosks & convenience",
    "restaurants": "Restaurants",
    "bars": "Bars",
    "fast_food_cafes": "Fast food & cafés",
    "taxis": "Taxis",
    "parking": "Parking",
    "cinemas": "Cinemas",
    "events_tickets": "Events & tickets",
    "attractions": "Attractions",
    "amusement_parks": "Amusement parks",
    "recreation_sports": "Recreation & sports",
    "sporting_goods": "Sporting goods",
    "clothing": "Clothing",
    "books": "Books",
    "toys_hobbies": "Toys & hobbies",
    "other_retail": "Other shops",
    "travel_agencies": "Travel agencies",
    "flights": "Flights",
    "hotels": "Hotels",
    "car_rental": "Car rental",
    "salary": "Salary",
    "other_income": "Other income",
    "investment_deposit": "Investment deposit",
    "investment_withdrawal": "Investment withdrawal",
    "salary_sweep": "Transfer to own account",
}


def basket_label(basket: str) -> str:
    return BASKET_LABELS.get(basket, basket)


def group_label(spend_group: str) -> str:
    return SPEND_GROUP_LABELS.get(spend_group, spend_group.replace("_", " ").capitalize())
