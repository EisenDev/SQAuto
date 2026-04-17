# services/ai_assistant/service.py
"""AI Assistant service placeholder.
Provides methods that will be called by the API routes to get AI explanations,
mapping suggestions, etc. Currently returns TODO responses.
"""

class AIAssistantService:
    def get_schema_explanation(self, job_id: str):
        """Return AI generated schema explanation (placeholder)."""
        return {"status": "TODO", "detail": f"Schema explanation for job {job_id} not implemented"}

    def get_mapping_suggestions(self, job_id: str):
        return {"status": "TODO", "detail": f"Mapping suggestions for job {job_id} not implemented"}

    def get_anomaly_summary(self, job_id: str):
        return {"status": "TODO", "detail": f"Anomaly summary for job {job_id} not implemented"}
