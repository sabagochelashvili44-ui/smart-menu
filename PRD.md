# Project: Smart AI Menu for Restaurants

## Core Architecture & Stack
- Framework: Next.js 14+ (App Router, TypeScript, Tailwind CSS)
- Database & Auth: Supabase (PostgreSQL)
- AI Engine: OpenAI API (GPT-4o) with RAG / System Prompts
- Deployment: Vercel

## Key Routes & Functionalities
1. Dynamic QR Menu (`/menu/[restaurantId]/[tableId]`):
   - Interactive Menu Display (Categories, Dishes, Images, Allergens)
   - Real-time Language Translation
   - AI Waiter Chatbot (Contextual Recommendations, Dish/Wine Pairing)
   - Dynamic Upselling & Mood-Based Ordering
   - Live Order Tracker & Kitchen Timer
   - Disaster/Negative Review Mitigation System

2. Restaurant Admin Panel (`/admin`):
   - Menu Management (Categories, Items, Ingredients, Expiry/Stock toggle)
   - Table & QR Code Generator (Printable QR codes with table IDs)
   - Live Kitchen Display (KDS) & Order Status Tracker
   - AI Analytics (Menu Engineering, Waste Prevention, Margin Upselling)

## Database Tables Required
- `restaurants` (id, name, logo, created_at)
- `tables` (id, restaurant_id, table_number)
- `categories` (id, restaurant_id, name, order_index)
- `dishes` (id, category_id, name, description, price, margin_score, image_url, allergens, is_available)
- `orders` (id, restaurant_id, table_id, status, total_amount, created_at)
- `reviews` (id, restaurant_id, rating, feedback, created_at)