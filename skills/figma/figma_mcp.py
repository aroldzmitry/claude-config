#!/usr/bin/env python3
import json
import socket
import sys
import re
import base64

HOST = "127.0.0.1"
PORT = 3845
TOOLS = [
    "get_design_context",
    "get_variable_defs",
    "get_screenshot",
    "get_metadata",
    "create_design_system_rules",
    "get_figjam",
]


def read_all(sock, timeout=30):
    sock.settimeout(timeout)
    data = b""
    try:
        while True:
            chunk = sock.recv(16384)
            if not chunk:
                break
            data += chunk
    except socket.timeout:
        pass
    return data.decode(errors="replace")


def send_request(session_id, payload):
    sock = socket.create_connection((HOST, PORT))
    body = json.dumps(payload)
    headers = (
        f"POST /mcp HTTP/1.1\r\n"
        f"Host: {HOST}:{PORT}\r\n"
        f"Content-Type: application/json\r\n"
        f"Accept: application/json, text/event-stream\r\n"
        f"Content-Length: {len(body)}\r\n"
    )
    if session_id:
        headers += f"Mcp-Session-Id: {session_id}\r\n"
    headers += "\r\n"
    sock.sendall((headers + body).encode())
    return sock


def init_session():
    sock = send_request(None, {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "claude-code-bridge", "version": "1.0"},
        },
    })
    r = read_all(sock, 5)
    sock.close()

    sid = None
    for line in r.split("\r\n"):
        if line.lower().startswith("mcp-session-id:"):
            sid = line.split(":", 1)[1].strip()
            break

    if not sid:
        print("Error: Figma Desktop MCP not responding. Is Figma open with Dev Mode?")
        sys.exit(1)

    sock = send_request(sid, {
        "jsonrpc": "2.0",
        "method": "notifications/initialized",
    })
    read_all(sock, 2)
    sock.close()

    return sid


def call_tool(sid, tool_name, arguments, timeout=30):
    sock = send_request(sid, {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
    })
    r = read_all(sock, timeout)
    sock.close()

    results = []
    for line in r.split("\n"):
        if line.startswith("data: "):
            try:
                parsed = json.loads(line[6:])
                if "result" in parsed:
                    for content in parsed["result"].get("content", []):
                        results.append(content)
                elif "error" in parsed:
                    print(f"Error: {json.dumps(parsed['error'], indent=2)}", file=sys.stderr)
                    sys.exit(1)
            except json.JSONDecodeError:
                pass
    return results


def extract_node_id(url):
    match = re.search(r"node-id=([^&]+)", url)
    if match:
        return match.group(1).replace("-", ":")
    return None


def parse_args():
    args = sys.argv[1:]
    if not args:
        print(
            "Usage: python3 figma_mcp.py [--tool TOOL] <figma_url_or_node_id>\n"
            "\n"
            "Tools: " + ", ".join(TOOLS) + "\n"
            "Default: get_design_context\n"
            "\n"
            "Examples:\n"
            '  python3 figma_mcp.py "https://figma.com/design/KEY/Name?node-id=1-2"\n'
            '  python3 figma_mcp.py --tool get_variable_defs "https://...?node-id=1-2"\n'
            '  python3 figma_mcp.py --tool get_screenshot 629:13629\n'
        )
        sys.exit(1)

    tool = "get_design_context"
    target = None

    i = 0
    while i < len(args):
        if args[i] == "--tool" and i + 1 < len(args):
            tool = args[i + 1]
            i += 2
        elif target is None:
            target = args[i]
            i += 1
        else:
            i += 1

    if tool not in TOOLS:
        print(f"Error: Unknown tool '{tool}'. Available: {', '.join(TOOLS)}", file=sys.stderr)
        sys.exit(1)

    return tool, target


def main():
    tool, target = parse_args()

    node_id = ""
    if target:
        if target.startswith("http"):
            node_id = extract_node_id(target) or ""
        else:
            node_id = target.replace("-", ":")

    sid = init_session()

    arguments = {}
    if node_id:
        arguments["nodeId"] = node_id

    results = call_tool(sid, tool, arguments)

    for content in results:
        ctype = content.get("type", "text")
        if ctype == "text":
            print(content.get("text", ""))
        elif ctype == "image":
            data = content.get("data", "")
            mime = content.get("mimeType", "image/png")
            ext = "png" if "png" in mime else "jpg"
            filename = f"/tmp/figma_screenshot.{ext}"
            with open(filename, "wb") as f:
                f.write(base64.b64decode(data))
            print(f"Screenshot saved: {filename}")
        else:
            print(json.dumps(content, indent=2))


if __name__ == "__main__":
    main()
