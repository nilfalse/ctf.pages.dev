-include .env
export MAXMIND_ACCOUNT_ID MAXMIND_LICENSE_KEY

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR :

public/maxmind/GeoLite2-Country.mmdb :
	@test -n "$$MAXMIND_ACCOUNT_ID" -a -n "$$MAXMIND_LICENSE_KEY" || { echo 'MAXMIND_ACCOUNT_ID and MAXMIND_LICENSE_KEY must be set' >&2; exit 1; }
	mkdir -p $(@D)
	curl -fsSL -D $(@D)/.headers -u "$$MAXMIND_ACCOUNT_ID:$$MAXMIND_LICENSE_KEY" 'https://download.maxmind.com/geoip/databases/GeoLite2-Country/download?suffix=tar.gz' | tar -xzv --strip-components 1 -C $(@D)
	grep -i '^content-disposition:' $(@D)/.headers | grep -Eo '[0-9]{8}' | tail -1 > $(@D)/RELEASE.txt
	rm $(@D)/.headers
	@test -s $@ -a -s $(@D)/RELEASE.txt

.PHONY : clean
clean :
	rm -rf public/maxmind
