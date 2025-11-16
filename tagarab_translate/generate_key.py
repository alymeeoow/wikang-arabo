import secrets
import base64


key = secrets.token_bytes(32) 
key_base64 = base64.b64encode(key).decode('utf-8')

print("Base64 Encoded Secret Key:", key_base64)