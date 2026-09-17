import os
import socket
import subprocess
import sys
import time


ROOT_DIR = os.path.dirname(os.path.abspath(__file__))


def start_process(command, working_directory):
    return subprocess.Popen(
        command,
        cwd=working_directory
    )


def stop_process(process):
    if process and process.poll() is None:
        process.terminate()


def wait_for_service(process, host, port, timeout=30):
    deadline = time.time() + timeout

    while time.time() < deadline:
        if process.poll() is not None:
            raise RuntimeError("The ML API stopped before becoming ready.")

        try:
            with socket.create_connection((host, port), timeout=1):
                return
        except OSError:
            time.sleep(1)

    raise RuntimeError("The ML API did not become ready within 30 seconds.")


def main():
    ml_process = None
    node_process = None

    try:
        ml_process = start_process(
            [sys.executable, "ml_api.py"],
            os.path.join(ROOT_DIR, "ML")
        )

        print("Starting ML API and loading the model...")
        wait_for_service(ml_process, "127.0.0.1", 5000)

        npm_command = "npm.cmd" if os.name == "nt" else "npm"
        node_process = start_process(
            [npm_command, "start"],
            ROOT_DIR
        )

        print("AI Sleep Monitor is running")
        print("Website: http://localhost:3000")
        print("ML API:  http://127.0.0.1:5000")
        print("Press Ctrl+C to stop the app")

        while True:
            if ml_process.poll() is not None:
                raise RuntimeError("The ML API stopped unexpectedly.")

            if node_process.poll() is not None:
                raise RuntimeError("The Node.js server stopped unexpectedly.")

            time.sleep(1)

    except KeyboardInterrupt:
        print("\nStopping AI Sleep Monitor...")
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 1
    finally:
        stop_process(node_process)
        stop_process(ml_process)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())