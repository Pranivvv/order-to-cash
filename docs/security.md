# Order to Cash Security

## Local Development

Local development uses CAP mocked authentication from `package.json`.

Users:
- `salesrep` / `pass`
- `manager` / `pass`
- `finance` / `pass`
- `inventory` / `pass`
- `admin` / `pass`

The local cockpit at `http://localhost:4004` uses browser Basic Auth. Browser Basic Auth does not provide a true logout endpoint, so use Incognito or clear site credentials to switch users locally.

## Production Security

Production uses:
- CAP JWT authentication with `@sap/xssec`
- XSUAA scopes and role collections from `xs-security.json`
- SAP Application Router from `app/router`
- Auth-token forwarding from approuter to the CAP service

Role collections:
- `O2C_SalesRep`
- `O2C_SalesManager`
- `O2C_FinanceUser`
- `O2C_InventoryManager`
- `O2C_Admin`

After deployment, assign users to these role collections in SAP BTP cockpit.

## Logout

The approuter exposes `/logout` and redirects to `/logout.html`.

The cockpit Logout button uses `/logout` when the app is accessed through approuter. When opened directly on local CAP port `4004`, it shows the local Basic Auth limitation instead.

## Deployment

The deployable security wiring is in:
- `mta.yaml`
- `xs-security.json`
- `app/router/xs-app.json`
- `app/router/package.json`

Build and deploy from the project root with the MTA toolchain:

```sh
mbt build
cf deploy mta_archives/order-to-cash_1.0.0.mtar
```

After deployment, open the approuter URL, not the CAP service URL, for browser usage.
