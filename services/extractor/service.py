# services/extractor/service.py
"""Service for extracting data from the profiled staging database.
Converts database tables into structured formats (Polars DataFrames) for cleaning and analysis.
"""

import logging
from sqlalchemy.orm import Session
import polars as pl
from apps.api.database import engine

logger = logging.getLogger("sqauto.extractor")

class ExtractorService:
    """Prepares and extracts data from the staging database."""

    def __init__(self):
        pass

    def extract_table(self, table_name: str) -> pl.DataFrame:
        """Extract a single table into a Polars DataFrame.
        
        Parameters
        ----------
        table_name : str
            The name of the table to extract.
            
        Returns
        -------
        pl.DataFrame
            The extracted data.
        """
        logger.info(f"Extracting table: {table_name}")
        # Using a read_database approach with polars
        # For simplicity in MVP, we read everything.
        query = f"SELECT * FROM {table_name}"
        df = pl.read_database(query=query, connection=engine.connect())
        return df

    def list_extractable_tables(self, profile: dict) -> list:
        """Filter profiled tables that are ready for extraction.
        
        Currently returns all tables found in the profile.
        """
        return list(profile.keys())
