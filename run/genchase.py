#!/usr/bin/env python3
"""Serve the GENChase folder over loopback HTTP and open index.html.

Uses only Python's standard library. Local module loading needs an HTTP origin.
Close this process, or press Ctrl+C, to stop it. The standalone fallback lives at
dist/studio.html and can be opened without this server, with browser limitations.
"""

import functools
import http.server
import os
import socketserver
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Quiet(http.server.SimpleHTTPRequestHandler):
    """The default handler narrates every request; a launcher window should stay readable."""

    def log_message(self, fmt, *args):
        pass


def main():
    page = os.path.join(ROOT, 'index.html')
    if not os.path.exists(page):
        sys.exit('index.html was not found. Keep run/ inside the complete GENChase folder; source contributors can run node tools/build.js.')

    handler = functools.partial(Quiet, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    # Port 0 asks the operating system for a free port, so a second copy of the studio never collides.
    with socketserver.TCPServer(('127.0.0.1', 0), handler) as httpd:
        url = 'http://127.0.0.1:%d/index.html' % httpd.server_address[1]
        print('GENChase is running at ' + url)
        print('Leave this window open. Press Ctrl+C to stop.')
        threading.Timer(0.6, webbrowser.open, (url,)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nStopped.')


if __name__ == '__main__':
    main()
