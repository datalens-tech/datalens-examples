def get_embed_details(name: str = 'default') -> dict | None:
    map = {
        'default': {
            'embed_data_id': '',
            'embed_key': b"""
                         """
        }
    }
    return map.get(f'{name}')
