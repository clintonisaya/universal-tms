from sqlmodel import Session, select, func
from app.core.db import engine
from app.models import Trip

def debug_stats():
    with Session(engine) as session:
        # Check raw trip statuses
        print("--- Raw Trip Statuses ---")
        trips = session.exec(select(Trip.status)).all()
        for t in trips:
            print(f"Status: '{t}' (Type: {type(t)})")

        # Check the group by query used in dashboard
        print("\n--- Group By Query Result ---")
        trip_status_rows = session.exec(
            select(Trip.status, func.count())
            .group_by(Trip.status)
        ).all()
        
        for status, count in trip_status_rows:
            print(f"Row: status={status} (Type: {type(status)}), count={count}")
            print(f"str(status): '{str(status)}'")

if __name__ == "__main__":
    debug_stats()