import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	async rewrites() {
		/**
		 * Local dev (and prod where frontend is on a different origin from the API) uses a hosted
		 * backend that sets HttpOnly cookies as `Secure; SameSite=Lax`. Browsers won't attach those
		 * cookies on cross-site XHR — but they will on same-origin requests.
		 *
		 * Fix: proxy /api/v1/* through Next so the browser sees same-origin. Next forwards the
		 * request server-to-server to the real backend, carrying cookies along.
		 *
		 * The destination still hits api.ovlox.dev — there's no "redirect to localhost". Open the
		 * Network tab and you'll see localhost:3000/api/v1/... in the URL bar; the actual upstream
		 * call to api.ovlox.dev happens out of band on the Next server.
		 */
		const upstream = process.env.NEXT_PUBLIC_API_URL;
		if (!upstream) return [];

		const upstreamRoot = upstream.replace(/\/+$/, "").replace(/\/api\/v1$/, "");

		return [
			{
				source: "/api/v1/:path*",
				destination: `${upstreamRoot}/api/v1/:path*`,
			},
		];
	},
};

export default nextConfig;
