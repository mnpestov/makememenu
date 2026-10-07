import asyncio
import os
from fastapi import FastAPI, Query
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Make Me Menu - Price Estimator")

class SearchResultItem(BaseModel):
    sku: str
    name: str
    price: float
    imageUrl: Optional[str] = None

class SearchResponse(BaseModel):
    items: List[SearchResultItem]

@app.get("/search", response_model=SearchResponse)
async def search_store(q: str = Query(..., description="Поисковой запрос, например 'яйцо'")):
    results = []
    
    try:
        from pyaterochka_api import PyaterochkaAPI
        async with PyaterochkaAPI() as api:
            search_results = await api.catalog_search(q)
            
            if search_results and "products" in search_results:
                for product in search_results["products"][:15]:  # Limit to 15 results
                    price = 0.0
                    if "current_price" in product:
                        price = float(product["current_price"])
                    elif "price" in product and isinstance(product["price"], dict):
                        price = float(product["price"].get("regular", 0.0))
                    elif "price" in product:
                        price = float(product["price"])
                        
                    if price > 0:
                        results.append(SearchResultItem(
                            sku=str(product.get("id", product.get("plu", ""))),
                            name=product.get("name", ""),
                            price=price,
                            imageUrl=product.get("image", None) or product.get("image_url", None)
                        ))
    except Exception as e:
        import traceback
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Ошибка при поиске в Пятёрочке: {str(e)}")

    return SearchResponse(items=results)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port)
