-include .env
export MAXMIND_ACCOUNT_ID MAXMIND_LICENSE_KEY

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR :

MAXMIND_URL := https://download.maxmind.com/geoip/databases/GeoLite2-Country/download?suffix=tar.gz
PUBLISHED_URL := https://ctf.pages.dev/maxmind

public/maxmind/GeoLite2-Country.mmdb :
	mkdir -p $(@D)
ifneq ($(and $(MAXMIND_ACCOUNT_ID),$(MAXMIND_LICENSE_KEY)),)
	curl -fsSL -D $(@D)/.headers -u "$$MAXMIND_ACCOUNT_ID:$$MAXMIND_LICENSE_KEY" '$(MAXMIND_URL)' | tar -xzv --strip-components 1 -C $(@D)
	grep -i '^content-disposition:' $(@D)/.headers | grep -Eo '[0-9]{8}' | tail -1 > $(@D)/RELEASE.txt
	rm $(@D)/.headers
else ifeq ($(CI),)
	@echo 'MAXMIND_ACCOUNT_ID/MAXMIND_LICENSE_KEY not set, fetching the published copy from $(PUBLISHED_URL)' >&2
	for f in GeoLite2-Country.mmdb COPYRIGHT.txt LICENSE.txt RELEASE.txt; do curl -fsSL -o $(@D)/$$f $(PUBLISHED_URL)/$$f; done
else
	@echo 'MAXMIND_ACCOUNT_ID and MAXMIND_LICENSE_KEY must be set' >&2; exit 1
endif
	@grep -Eqx '[0-9]{8}' $(@D)/RELEASE.txt && grep -qa 'MaxMind.com' $@

.PHONY : clean
clean :
	rm -rf public/maxmind
