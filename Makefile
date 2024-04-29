.PHONY: up stop down sh

SCOPE = product

default:
	cat Makefile

up:
	docker-compose up --force-recreate

up-services:
	docker-compose up redis

stop:
	docker-compose stop

down:
	docker-compose down

sh:
	docker-compose run --rm app sh
