import os
import time
from datetime import datetime

import jwt
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, HTMLResponse

from embed_data_mapping import get_embed_details
from functions_logger import logger
from user_auth import get_user_oauth_token, get_user_jwt_token, decode_user_jwt_token

app = FastAPI()


def get_datalens_token(uid: int) -> str:
    logger.debug("start get_datalens_token")
    embed_details = get_embed_details()
    now = int(time.time())
    payload = {
        'embedId': embed_details.get('embed_data_id'),
        'dlEmbedService': "YC_DATALENS_EMBEDDING_SERVICE_MARK",
        'iat': now,
        'exp': now + 60,
        "params": dict(uid=uid)
    }
    encoded_token = jwt.encode(
        payload=payload,
        key=embed_details.get('embed_key'),
        algorithm='PS256',
    )
    logger.debug({'message': 'end get_datalens_token',
                 'embed_id': payload.get('embedId'),
                 'params': payload.get('params'),
                 'iat': datetime.fromtimestamp(payload.get('iat')),
                 'exp': datetime.fromtimestamp(payload.get('exp'))})
    return encoded_token


def get_embed_page(user_data: dict) -> str | RedirectResponse:
    logger.debug("start get_embed_page")
    try:
        logger.debug({"message": "catch token", "uid": user_data.get('uid')})
        return f"""
                <!DOCTYPE html>
                <html>
                    
                   <body>
                      <h1>Привет {user_data.get('name')}! Твой uid - {user_data.get('uid')} </h1>
                      <iframe src="https://datalens.yandex.cloud/embeds/dash#dl_embed_token={get_datalens_token(user_data.get('uid'))}" style="position:fixed; top:0; left:0; bottom:0; right:0; width:100%; height:100%; border:none; margin:0; padding:0; overflow:hidden; z-index:999999;"></iframe>
                   </body>
                </html>
                """
    except Exception as e:
        logger.error({"message": f"{e=}",
                      "traceback": e.__traceback__,
                      "doc": e.__doc__})
        return RedirectResponse(url="/forbidden")


@app.get('/', response_class=HTMLResponse)
async def home(request: Request):
    logger.debug("get / request")
    token = request.cookies.get('datalensEmbedToken')
    if token is None:
        logger.debug("cant get datalensEmbedToken cookie, return redirect to /auth_page")
        return RedirectResponse(url=f"/auth_page")
    else:
        user_data = decode_user_jwt_token(user_jwt_token=token)
        logger.debug({'message': 'end get_datalens_token',
                      'uid': user_data.get('uid'),
                      'exp': datetime.fromtimestamp(user_data.get('exp'))})
        embed_page = get_embed_page(user_data=user_data)
        logger.debug("got datalensEmbedToken cookie, return embed page")
        return embed_page


@app.get('/get_datalens_url', response_class=RedirectResponse)
async def get_datalens_url(request: Request):
    logger.debug("get / request")
    token = request.cookies.get('datalensEmbedToken')
    if token is None:
        logger.debug("cant get datalensEmbedToken cookie, return redirect to /auth_page")
        return RedirectResponse(url=f"/auth_page")
    else:
        user_data = decode_user_jwt_token(user_jwt_token=token)
        logger.debug("got datalensEmbedToken cookie, return embed page")
        return RedirectResponse(
        url=f"https://datalens.yandex.cloud/embeds/dash#dl_embed_token={get_datalens_token(user_data.get('uid'))}")


@app.get('/auth_page', response_class=HTMLResponse)
async def get_auth_page() -> str:
    logger.debug("get /auth_page request")
    logger.debug("return /auth_page page")
    return """
            <!DOCTYPE html>
            <html>
               <body>
                  <h2>Вы не авторизованы. Пройдите авторизацию, чтобы получить доступ</h2>
                  <a href="/get_code">
                    <button>Пройти авторизацию</button>
                  </a>
               </body>
            </html>
            """


@app.get('/forbidden', response_class=HTMLResponse)
async def get_forbidden_page() -> str:
    logger.debug("get /forbidden request")
    logger.debug("return /forbidden page")
    return """
                <!DOCTYPE html>
                <html>
                   <body>
                      <h2>Доступ запрещен</h2>
                      <a href="/get_code">
                        <button>Попробовать авторизоваться еще раз</button>
                      </a>
                   </body>
                </html>
                """


@app.get("/get_code", response_class=RedirectResponse)
async def get_code():
    logger.debug("get /get_code request")
    host = os.getenv('host')
    client_id = os.getenv('client_id')
    logger.debug("return redirect to https://oauth.yandex.ru/authorize?response_type=code")
    return RedirectResponse(
        url=f"https://oauth.yandex.ru/authorize?response_type=code"
            f"&client_id={client_id}"
            f"&redirect_uri={host}/authorise")


@app.get("/authorise", response_class=RedirectResponse)
async def authorise(code: str = None):
    logger.debug("get /authorise request")
    try:
        user_oauth_token = get_user_oauth_token(user_code=code)
        user_jwt_token = get_user_jwt_token(user_oauth_token=user_oauth_token)
        response = RedirectResponse(os.getenv('host'))
        response.set_cookie(key='datalensEmbedToken', value=user_jwt_token, httponly=True, secure=True)
        logger.debug("return authorise reqsponse with datalensEmbedToken cookie")
        return response
    except Exception as e:
        logger.error({"message": f"{e=}",
                      "traceback": e.__traceback__,
                      "doc": e.__doc__})
        logger.debug("return redirect to /forbidden")
        return RedirectResponse("/forbidden")
