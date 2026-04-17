#!/usr/bin/env python3
import subprocess
import os
import sys
import time

def run_command(command, cwd, name):
    print(f"[*] Starting {name}...")
    return subprocess.Popen(
        command,
        cwd=cwd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        bufsize=1
    )

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    # Check for .env
    if not os.path.exists(os.path.join(root_dir, ".env")):
        if os.path.exists(os.path.join(root_dir, ".env.example")):
            print("[!] .env not found, creating from .env.example")
            with open(os.path.join(root_dir, ".env.example"), "r") as f_ex:
                with open(os.path.join(root_dir, ".env"), "w") as f_env:
                    f_env.write(f_ex.read())
        else:
            print("[!] Error: .env.example not found. Please create .env manually.")
            sys.exit(1)

    # 1. Backend
    # Use venv python to run uvicorn as a module for maximum reliability
    venv_python = os.path.join(root_dir, ".venv", "bin", "python")
    if os.path.exists(venv_python):
        backend_cmd = f"{venv_python} -m uvicorn apps.api.main:app --reload --host 127.0.0.1 --port 8000"
    else:
        # Fallback to system python if venv is missing
        backend_cmd = "python3 -m uvicorn apps.api.main:app --reload --host 127.0.0.1 --port 8000"
    
    backend_proc = run_command(backend_cmd, root_dir, "Backend (FastAPI)")

    # 2. Frontend
    frontend_cmd = "npm run dev:web"
    frontend_proc = run_command(frontend_cmd, root_dir, "Frontend (Next.js)")

    print("\n[+] Both services are starting!")
    print("[+] API: http://localhost:8000/api")
    print("[+] API Docs: http://localhost:8000/docs")
    print("[+] Web: http://localhost:3000\n")
    print("[*] Press Ctrl+C to stop both services.\n")

    try:
        while True:
            # Check if processes are still running
            if backend_proc.poll() is not None:
                print(f"[!] Backend process exited with code {backend_proc.returncode}")
                break
            if frontend_proc.poll() is not None:
                print(f"[!] Frontend process exited with code {frontend_proc.returncode}")
                break
            
            # Print output from processes
            for proc, name in [(backend_proc, "API"), (frontend_proc, "WEB")]:
                line = proc.stdout.readline()
                if line:
                    print(f"[{name}] {line.strip()}")
            
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n[*] Stopping services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("[+] Goodbye!")

if __name__ == "__main__":
    main()
