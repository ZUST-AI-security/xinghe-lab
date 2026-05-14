from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from processor import processor
import uvicorn

app = FastAPI(title="Nebula-7 API v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process")
async def process_image(
    file: UploadFile = File(...),
    mode: str = Form("dream")
):
    contents = await file.read()

    profile = None
    if mode == "dream":
        result, profile = processor.get_hallucination_v2(contents)
    elif mode == "ghost":
        result = processor.get_adversarial_glitch(contents)
        profile = {
            "archetype": "Phantom",
            "confidence": "UNKNOWN",
            "signal_stability": "CRITICAL",
            "detected_class_id": 999,
            "observation": "The machine is being actively deceived. Reality is fracturing."
        }
    elif mode == "pulse":
        result = processor.get_pulse_perturbation(contents)
        profile = {
            "archetype": "Anomaly",
            "confidence": "OVERDRIVE",
            "signal_stability": "UNSTABLE",
            "detected_class_id": 666,
            "observation": "Extreme perturbation detected. The signal has exceeded safe parameters. Neural pathways are destabilizing."
        }
    else:
        return {"error": f"Unknown mode: {mode}"}, 400

    return {
        "result": f"data:image/png;base64,{result}",
        "mode": mode,
        "profile": profile
    }

@app.get("/status")
def status():
    return {"status": "Nebula-7 Engine Online", "version": "2.0.0"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
