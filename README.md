


## Get user referenced in the given category.

```
GET /jeffrey-users/_search
{
  "query": {
    "bool": {
      "filter": [
        {
          "term": { "categories": "8e374b63-0270-4d15-bbb4-9827da8ba0ef"}
        },
        {
          "term": { "categories": "50ba30b7-90d4-4855-b305-dad05c39a52b" }
        },
        {
          "term": {  "is_provider": true }
        },
        {
          "term": { "is_available": true }
        },
        {
          "term": { "is_tester": true }
        }
      ]
    }
  }
}
```
