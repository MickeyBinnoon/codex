import os
from Crypto.Cipher import AES
from Crypto.Util import Padding

KEY = bytes.fromhex(os.getenv('ENCRYPTION_KEY', ''))
if not KEY:
    raise SystemExit('Missing ENCRYPTION_KEY')

def decrypt(value: str) -> str:
    if not value:
        return ''
    iv_hex, data_hex = value.split(':')
    iv = bytes.fromhex(iv_hex)
    data = bytes.fromhex(data_hex)
    cipher = AES.new(KEY, AES.MODE_CBC, iv)
    decrypted = cipher.decrypt(data)
    return Padding.unpad(decrypted, AES.block_size).decode('utf-8')
