#!/usr/bin/env python3

"""
Simple HTTPS server for testing TSL shaders with A-Frame WebGPU.
Serves files with proper CORS headers and HTTPS (required for WebGPU).
"""

import http.server
import socketserver
import ssl
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def run_server():
    PORT = 8443
    
    # Check if certificates exist
    cert_file = 'https/localhost.pem'
    key_file = 'https/localhost2.key'
    
    if not os.path.exists(cert_file) or not os.path.exists(key_file):
        print(f"Certificates not found. Please ensure {cert_file} and {key_file} exist.")
        print("You can generate them using:")
        print("openssl req -x509 -newkey rsa:4096 -keyout https/localhost2.key -out https/localhost.pem -days 365 -nodes")
        return
    
    # Create server
    with HTTPServer(('localhost', PORT), CORSRequestHandler) as httpd:
        # Add SSL context
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(cert_file, key_file)
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
        
        print(f"🚀 TSL Shader Carousel Server running at:")
        print(f"   https://localhost:{PORT}")
        print(f"   https://localhost:{PORT}/tsl-showcase.html")
        print(f"\n📁 Serving files from: {os.getcwd()}")
        print(f"🔒 HTTPS enabled (required for WebGPU)")
        print(f"\n🎨 Available examples:")
        print(f"   - tsl-showcase.html (Full showcase)")
        print(f"   - simple-tsl-example.html (Simple example)")
        print(f"   - index-webgpu-tsl.html (Advanced example)")
        print(f"\n👉 Open your browser and navigate to the URLs above")
        print(f"   Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n🛑 Server stopped")

if __name__ == '__main__':
    run_server()