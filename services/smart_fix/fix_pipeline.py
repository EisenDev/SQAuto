import uuid

class FixPipelineService:
    def __init__(self):
        # In a complete implementation, this would persist to the db.
        # For Phase 4 foundation, we mock the storage.
        self._mock_plans = {}

    def create_fix_plan(self, source_job_id: str, selected_suggestions: list) -> dict:
        """
        Creates a fix plan containing selected suggestions to be applied.
        """
        plan_id = str(uuid.uuid4())
        plan = {
            "id": plan_id,
            "source_job_id": source_job_id,
            "status": "pending_preview",
            "suggestions": selected_suggestions
        }
        self._mock_plans[plan_id] = plan
        return plan

    def preview_fix_plan(self, fix_plan_id: str) -> dict:
        """
        Generates a summary of the entire fix plan's impact.
        """
        plan = self._mock_plans.get(fix_plan_id)
        if not plan:
            return {"error": "Fix plan not found"}

        # Simulate compiling previews for all individual fixes
        return {
            "id": fix_plan_id,
            "total_fixes": len(plan["suggestions"]),
            "estimated_total_rows_affected": len(plan["suggestions"]) * 10, # Mock
            "safe_to_apply": False,  # Staging architecture needs verification
            "warnings": [
                "Preview Only — staging apply not enabled yet."
            ]
        }

    def apply_fix_plan_to_staging_copy(self, fix_plan_id: str) -> dict:
        """
        Applies the compiled fix plan sequentially to the staging DB.
        Currently restricts execution to preview mode as per safety rules.
        """
        return {
            "status": "blocked",
            "message": "Preview Only — staging apply not enabled yet.",
            "error": "Safe staging-copy fix architecture is not active."
        }
