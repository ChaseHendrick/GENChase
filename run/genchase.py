#!/usr/bin/env python3
"""Serve the GENChase folder on a free local port and open studio.html in the default browser.

Nothing is installed and nothing is bundled: this is the Python standard library's http.server pointed at
the folder this launcher sits in. It listens on the loopback address only, so it is not reachable from the
network. Close the window, or press Ctrl+C, to stop it.

studio.html also opens by double-clicking it. The server exists because a browser treats a file:// page as
having no origin, which costs the studio its saved settings and gallery between sessions, and because a few
modules read their own page text. Served from a real origin, all of that works.
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
    page = os.path.join(ROOT, 'studio.html')
    if not os.path.exists(page):
        sys.exit('studio.html was not found next to this launcher. Keep run/ inside the GENChase folder.')

    handler = functools.partial(Quiet, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    # Port 0 asks the operating system for a free port, so a second copy of the studio never collides.
    with socketserver.TCPServer(('127.0.0.1', 0), handler) as httpd:
        url = 'http://127.0.0.1:%d/studio.html' % httpd.server_address[1]
        print('GENChase is running at ' + url)
        print('Leave this window open. Press Ctrl+C to stop.')
        threading.Timer(0.6, webbrowser.open, (url,)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nStopped.')


if __name__ == '__main__':
    main()
