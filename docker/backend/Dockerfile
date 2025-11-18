FROM python:3.13

WORKDIR /app

COPY ./backend/requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

RUN mkdir /app/db

COPY ./backend/app /app/app
COPY ./backend/.env /app/.env
COPY ./backend/keys.json /app/keys.json

RUN python3 -m app.seed

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]