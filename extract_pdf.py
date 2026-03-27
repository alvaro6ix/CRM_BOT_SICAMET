import sys
import glob

def try_extract():
    try:
        import PyPDF2
        for pdf in glob.glob("*.pdf"):
            print(f"--- {pdf} ---")
            reader = PyPDF2.PdfReader(pdf)
            for i, page in enumerate(reader.pages[:2]):
                print(page.extract_text()[:300])
    except ImportError:
        try:
            import fitz
            for pdf in glob.glob("*.pdf"):
                print(f"--- {pdf} ---")
                doc = fitz.open(pdf)
                for page in doc[:2]:
                    print(page.get_text()[:300])
        except ImportError:
            print("No PDF library found. Please install PyPDF2 or pymupdf.")

if __name__ == "__main__":
    try_extract()
