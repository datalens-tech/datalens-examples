import os
import requests
from functions_logger import logger
import base64
import jwt


def get_user_oauth_token(user_code: str) -> str:
    logger.debug("start get_user_oauth_token")
    client_id = os.getenv('client_id')
    client_secret = os.getenv('client_secret')
    auth_key = base64.b64encode(bytes(f'{client_id}:{client_secret}', 'ascii')).decode('ascii')
    url = f'https://oauth.yandex.ru/token'
    token_get_result = requests.post(
        url=url,
        headers={"Content-type": "application/x-www-form-urlencoded",
                 "Content-Length": f"{len(url)}",
                 "Authorization": f"Basic {auth_key}"},
        data={"grant_type": "authorization_code",
              "code": user_code}
    )
    token = token_get_result.json().get('access_token')
    assert token is not None, (f"catch {token_get_result.status_code} from https://oauth.yandex.ru/token, "
                               f"response {token_get_result.json()}")
    logger.debug("end get_user_oauth_token")
    return token

def get_user_jwt_token(user_oauth_token: str) -> str | None:
    logger.debug("start get_user_jwt_token")
    try:
        res = requests.get(url='https://login.yandex.ru/info?format=jwt',
                            headers={'Authorization': f'OAuth {user_oauth_token}'})
        assert res.status_code == 200, f"catch {res.status_code}"
        logger.debug("end get_user_jwt_token")
        return res.text
    except AssertionError as e:
        logger.error({"message": f"fail in get_user_jwt_token, {e=}",
                      "traceback": e.__traceback__,
                      "doc": e.__doc__})
        return None

def decode_user_jwt_token(user_jwt_token: str) -> dict | None:
    logger.debug("start decode_user_jwt_token")
    client_secret = os.getenv('client_secret')
    try:
        user_data = jwt.decode(jwt=user_jwt_token, key=client_secret, algorithms=['HS256'])
        logger.debug("end decode_user_jwt_token")
        return user_data
    except Exception as e:
        logger.error({"message": f"fail in decode_user_jwt_token, {e=}",
                      "traceback": e.__traceback__,
                      "doc": e.__doc__})
        return None