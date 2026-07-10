#!/usr/bin/env python3
"""Export a Figma node as PNG via the local Figma Dev Mode MCP server.

Usage: figma-export-node.py <nodeId> <output.png>
  nodeId: e.g. "123:456" or "123-456" (node must be in the currently open Figma file)

Works around the harness limitation that inline MCP images cannot be saved:
calls the MCP server over HTTP directly and decodes the base64 image body.
Exit 0 on success, 1 on any failure (server unreachable, node not found, no image).
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ.get("FIGMA_MCP_URL", "http://127.0.0.1:3845/mcp")


def rpc(payload, session=None):
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if session:
        headers["mcp-session-id"] = session
    req = urllib.request.Request(URL, json.dumps(payload).encode(), headers)
    resp = urllib.request.urlopen(req, timeout=60)
    sid = resp.headers.get("mcp-session-id")
    body = resp.read().decode()
    datas = [l[5:].strip() for l in body.splitlines() if l.startswith("data:")]
    return sid, [json.loads(d) for d in datas if d]


def main():
    if len(sys.argv) != 3:
        print(__doc__.strip(), file=sys.stderr)
        return 1
    node, out_path = sys.argv[1], sys.argv[2]
    try:
        sid, _ = rpc({
            "jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {"protocolVersion": "2025-03-26", "capabilities": {},
                       "clientInfo": {"name": "figma-export-node", "version": "1.0"}},
        })
        rpc({"jsonrpc": "2.0", "method": "notifications/initialized"}, sid)
        _, res = rpc({
            "jsonrpc": "2.0", "id": 2, "method": "tools/call",
            "params": {"name": "get_screenshot", "arguments": {"nodeId": node}},
        }, sid)
    except (urllib.error.URLError, OSError) as e:
        print(f"ERROR: Figma MCP server unreachable at {URL}: {e}", file=sys.stderr)
        return 1
    if not res:
        print("ERROR: empty MCP response", file=sys.stderr)
        return 1
    r = res[0].get("result", res[0])
    if r.get("isError"):
        print(f"ERROR: MCP tool error: {json.dumps(r)[:300]}", file=sys.stderr)
        return 1
    for c in r.get("content", []):
        if c.get("type") == "image":
            raw = base64.b64decode(c["data"])
            with open(out_path, "wb") as f:
                f.write(raw)
            print(f"saved {out_path} ({len(raw)} bytes, {c.get('mimeType')})")
            return 0
    print(f"ERROR: no image block in response: {json.dumps(r)[:300]}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
