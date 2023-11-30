#!/bin/bash

gen-random-str() {
  tr -dc A-Za-z0-9 </dev/urandom | head -c $1 && echo
}

gen-fernet-key() {
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
}

echo BI_COMPENG_POSTGRES_PASSWORD=$(gen-random-str 32)
echo DL_CRY_KEY=\"$(gen-fernet-key)\"
echo
echo US_POSTGRES_PASSWORD=$(gen-random-str 32)
echo US_MASTER_TOKEN=$(gen-random-str 64)
echo
echo AUTHELIA_JWT_SECRET=$(gen-random-str 64)
echo AUTHELIA_SESSION_SECRET=$(gen-random-str 64)
echo AUTHELIA_STORAGE_ENCRYPTION_KEY=$(gen-random-str 32)
