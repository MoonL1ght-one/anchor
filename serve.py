#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""锚点 · 本地启动器

为什么需要一个本地服务器：浏览器把 http://127.0.0.1:8787 当成一个稳定的「源」，
你的数据（localStorage）就会固定存在这个源下。若每次用随机端口，换端口就等于换了一个
浏览器身份，之前写的东西会看不见。所以这里坚持使用固定端口。

只用 Python 标准库，无第三方依赖。
"""

import http.server
import os
import sys
import threading
import urllib.request
import webbrowser

HOST = "127.0.0.1"
PORT = 8787
ROOT = os.path.dirname(os.path.abspath(__file__))
URL = f"http://{HOST}:{PORT}/index.html"


class Handler(http.server.SimpleHTTPRequestHandler):
    """静默、禁缓存的静态文件服务。"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):  # noqa: A003 - 覆盖父类方法名
        pass

    def handle_one_request(self):
        # 用户关掉标签页时 Windows 会抛 10053，不必把堆栈打到控制台
        try:
            super().handle_one_request()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            self.close_connection = True

    def handle(self):
        try:
            super().handle()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def already_running() -> bool:
    """端口上已经跑着一个锚点实例时，直接打开浏览器即可。"""
    try:
        with urllib.request.urlopen(URL, timeout=0.8) as resp:
            body = resp.read(2048).decode("utf-8", "ignore")
            return "锚点" in body
    except Exception:
        return False


def open_browser() -> None:
    try:
        webbrowser.open(URL)
    except Exception:
        pass


def main() -> int:
    if not os.path.exists(os.path.join(ROOT, "index.html")):
        print("找不到 index.html，请把这个脚本和 index.html 放在同一个目录。")
        return 1

    if already_running():
        print("锚点已经在运行，正在打开浏览器……")
        open_browser()
        return 0

    try:
        server = Server((HOST, PORT), Handler)
    except OSError:
        print(f"端口 {PORT} 被别的程序占用了。")
        print("请关掉占用它的程序，或直接双击 index.html（加密功能需要本地服务器）。")
        return 1

    print("=" * 52)
    print("  锚点 · 个人底层系统")
    print(f"  地址：{URL}")
    print("  数据只保存在这个地址下的浏览器存储里，不上传。")
    print("  关掉这个窗口即停止服务；再次运行 start.bat 数据还在。")
    print("=" * 52)

    threading.Timer(0.6, open_browser).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
