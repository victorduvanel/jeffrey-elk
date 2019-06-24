#!/bin/sh

curl -X PUT -H "Content-Type: application/json" -d @./mapping.json  http://reptilians.io:9200/jeffrey-users/_mapping
