from pathlib import Path

try:
    from openpyxl import Workbook  # type: ignore
except Exception as exc:
    raise SystemExit("openpyxl is required. Install with: python3 -m pip install openpyxl") from exc


def main() -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "Projects"

    headers = [
        "title",
        "student_name",
        "category",
        "tags",
        "description",
        "year",
    ]
    ws.append(headers)

    rows = [
        [
            "Autonomous Drone Navigation",
            "Alice Johnson",
            "Robotics",
            "drone,cv,ai",
            "A drone that navigates indoor spaces using computer vision.",
            2024,
        ],
        [
            "Real-time Sign Language Translator",
            "Brian Lee",
            "AI/ML",
            "nlp,cv,accessibility",
            "Translates sign language to text and speech using pose estimation.",
            2025,
        ],
        [
            "Campus Energy Dashboard",
            "Carla Gomez",
            "Sustainability",
            "data viz,iot,energy",
            "Interactive dashboard tracking building-level energy consumption.",
            2023,
        ],
        [
            "AR Anatomy Tutor",
            "Derek Chen",
            "AR/VR",
            "education,ar,health",
            "Augmented reality application for learning human anatomy.",
            2025,
        ],
        [
            "Secure Password Manager",
            "Eva Martins",
            "Security",
            "crypto,security,cli",
            "Cross-platform password manager with zero-knowledge encryption.",
            2022,
        ],
        [
            "Smart Garden Monitor",
            "Farid Khan",
            "IoT",
            "sensors,raspberry pi,garden",
            "Monitors soil moisture and automates irrigation via a mobile app.",
            2024,
        ],
        [
            "Language Learning Chatbot",
            "Grace Park",
            "Education",
            "chatbot,language,nlp",
            "Conversational agent for practicing everyday dialogues.",
            2023,
        ],
        [
            "Art Style Transfer Studio",
            "Hiro Tanaka",
            "Creative Tech",
            "gan,images,art",
            "Web app to apply neural style transfer to photos.",
            2021,
        ],
        [
            "Open Data Transit Planner",
            "Isabella Rossi",
            "Civic Tech",
            "maps,gtfs,route planning",
            "Transit route planner using open GTFS feeds.",
            2024,
        ],
        [
            "Voice-Controlled Home Hub",
            "Jamal O'Neal",
            "Embedded",
            "voice,iot,home automation",
            "Local-first voice assistant for controlling smart devices.",
            2022,
        ],
    ]

    for r in rows:
        ws.append(r)

    output_path = Path.cwd() / "sample_projects.xlsx"
    wb.save(output_path)
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()



