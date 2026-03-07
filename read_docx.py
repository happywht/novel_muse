import zipfile
import xml.etree.ElementTree as ET
import sys

def read_docx(file_path):
    try:
        doc = zipfile.ZipFile(file_path)
        xml_content = doc.read('word/document.xml')
        doc.close()
        tree = ET.XML(xml_content)
        
        paragraphs = []
        for paragraph in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
            texts = [node.text for node in paragraph.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
            if texts:
                paragraphs.append(''.join(texts))
            else:
                paragraphs.append('') # might be empty line
        return '\n'.join(paragraphs)
    except Exception as e:
        return str(e)

if __name__ == "__main__":
    path = sys.argv[1]
    out_path = sys.argv[2]
    content = read_docx(path)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)
