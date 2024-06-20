import json
from PIL import Image, ImageDraw
import matplotlib.pyplot as plt

# Load the JSON data
with open('facebook.com.json', 'r') as file:
    clicks = json.load(file)

# Load the image
image = Image.open('facebook.com.png')
draw = ImageDraw.Draw(image)

# Draw bounding boxes
for click in clicks:
    # Each bounding box is defined by the coordinates (x, y, x+width, y+height)
    rectangle = [click['x'], click['y'], click['x'] + click['width'], click['y'] + click['height']]
    draw.rectangle(rectangle, outline='red', width=2)

# Display the image
plt.imshow(image)
plt.axis('off')  # Turn off axis numbers and ticks
plt.show()
