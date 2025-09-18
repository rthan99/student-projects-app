from .db import reset_database
from .models import create_project


def run_seed() -> None:
    reset_database()
    create_project(
        title="AI Chess Coach",
        student_name="Alex Kim",
        category="AI",
        tags=["python", "ml"],
        description="A chess tactics coach powered by simple evaluation heuristics.",
        year=2024,
    )
    create_project(
        title="Eco Garden Monitor",
        student_name="Priya Singh",
        category="IoT",
        tags=["raspberry pi", "sensors"],
        description="Monitors soil moisture and sunlight with a friendly dashboard.",
        year=2023,
    )
    create_project(
        title="VR Campus Tour",
        student_name="Jordan Lee",
        category="VR/AR",
        tags=["unity", "3d"],
        description="An immersive virtual tour of the university campus.",
        year=2022,
    )


if __name__ == "__main__":
    run_seed()


