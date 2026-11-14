# Vercel edge

The public https domain. Vercel terminates TLS and forwards every request to the web container on the VPS, which runs next to Postgres and the Docker worker that does the reruns.

Deploy: `cd deploy/vercel && vercel deploy --prod`. The VPS web image must be built with `SITE_URL` set to this domain (deploy/.env on the VPS), so canonical URLs, share images and the sitemap point here.
