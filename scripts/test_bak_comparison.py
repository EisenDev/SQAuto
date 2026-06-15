import os
import sys

# Add project root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.comparison.service import SqlDumpComparisonService

def test_bak_comparison():
    # 1. Create two dummy binary .bak files
    # File A: contains dbo.users, dbo.orders, dbo.products
    # File B: contains dbo.users, dbo.orders, dbo.categories
    # This will simulate missing tables
    
    file_a_path = "source_a.bak"
    file_b_path = "source_b.bak"
    
    try:
        # We construct binary files containing these patterns
        with open(file_a_path, "wb") as f:
            f.write(b"\x00\x01\x02\x03\x00[dbo].[users]\x00\x00\x00[dbo].[orders]\x00\x00\x00dbo.products\x00")
            
        with open(file_b_path, "wb") as f:
            f.write(b"\x00\x01\x02\x03\x00[dbo].[users]\x00\x00\x00[dbo].[orders]\x00\x00\x00dbo.categories\x00")
            
        print("Testing SqlDumpComparisonService with binary .bak files...")
        
        service = SqlDumpComparisonService()
        result = service.compare(file_a_path, file_b_path)
        
        print("\nComparison completed successfully!")
        print(f"Status: {result['status']}")
        
        summary = result['summary']
        print("\nSummary metrics:")
        for k, v in summary.items():
            print(f"  {k}: {v}")
            
        differences = result['differences']
        print("\nDifferences:")
        print(f"  Matched tables: {differences['tables']['matched']}")
        print(f"  Missing in B: {differences['tables']['missing_in_b']}")
        print(f"  Missing in A: {differences['tables']['missing_in_a']}")
        
        # Verify dialect detection
        print(f"\nSource A Dialect: {result['sources']['a']['dialect']} (confidence {result['sources']['a']['dialect_confidence']})")
        print(f"Source B Dialect: {result['sources']['b']['dialect']} (confidence {result['sources']['b']['dialect_confidence']})")
        
        # Assertions
        assert result['status'] == "completed"
        assert "users" in differences['tables']['matched']
        assert "orders" in differences['tables']['matched']
        assert "products" in differences['tables']['missing_in_b']
        assert "categories" in differences['tables']['missing_in_a']
        assert result['sources']['a']['dialect'] == "sqlserver"
        
        print("\nAll assertions passed!")
        
    finally:
        # Cleanup
        if os.path.exists(file_a_path):
            os.remove(file_a_path)
        if os.path.exists(file_b_path):
            os.remove(file_b_path)

if __name__ == "__main__":
    test_bak_comparison()
