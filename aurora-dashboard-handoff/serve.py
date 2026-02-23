#!/usr/bin/env python3
"""
Aurora Funnel Dashboard — Local Proxy Server
Run:  python3 serve.py
Then open: http://localhost:8741
"""

import http.server
import urllib.request
import urllib.parse
import os, json, sys

PORT      = 8741
API_KEY   = "0d2faf49-562b-41c1-8361-a52a3d6aaeb4dba7d1909ce1424ebfda7f0d99fc23b1"
API_BASE  = "https://auroramirror.com/api/data"
DASHBOARD = os.path.join(os.path.dirname(__file__), "aurora-funnel-dashboard.html")


class Handler(http.server.BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        # Cleaner console output
        print(f"  {self.address_string()}  {fmt % args}")

    def send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "x-api-key, Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path   = parsed.path

        # ── Serve dashboard HTML ──
        if path in ("/", "/index.html", "/aurora-funnel-dashboard.html"):
            try:
                with open(DASHBOARD, "rb") as f:
                    body = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except FileNotFoundError:
                self._send_json(404, {"error": "dashboard HTML not found"})
            return

        # ── Proxy /api/data/* → auroramirror.com/api/data/* ──
        if path.startswith("/api/data"):
            suffix = path[len("/api/data"):]   # e.g. "/stats", "/sessions"
            qs     = parsed.query
            target = f"{API_BASE}{suffix}" + (f"?{qs}" if qs else "")
            try:
                req = urllib.request.Request(
                    target,
                    headers={"x-api-key": API_KEY, "User-Agent": "AuroraFunnelDashboard/1.0"}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    body    = resp.read()
                    ctype   = resp.headers.get("Content-Type", "application/json")
                    status  = resp.status
                self.send_response(status)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(body)))
                self.send_cors()
                self.end_headers()
                self.wfile.write(body)
            except urllib.error.HTTPError as e:
                body = e.read()
                self.send_response(e.code)
                self.send_header("Content-Type", "application/json")
                self.send_cors()
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                self._send_json(502, {"error": str(e)})
            return

        # ── 404 for anything else ──
        self._send_json(404, {"error": f"not found: {path}"})

    def _send_json(self, status, obj):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_cors()
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    os.chdir(os.path.dirname(__file__))
    httpd = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
    print(f"\n  Aurora Funnel Dashboard")
    print(f"  ───────────────────────────────────────")
    print(f"  Dashboard  →  http://localhost:{PORT}")
    print(f"  API proxy  →  http://localhost:{PORT}/api/data/*")
    print(f"  Press Ctrl+C to stop.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")
        sys.exit(0)
