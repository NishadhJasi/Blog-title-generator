async function generateTitles() {
  const content = document.getElementById('contentInput').value.trim();
  const tone = document.getElementById('tone').value;
  const style = document.getElementById('style').value;
  const maxChars = parseInt(document.getElementById('maxChars').value);
  const maxWords = parseInt(document.getElementById('maxWords').value);
  const resultContainer = document.getElementById('result');

  // Clear previous result
  resultContainer.innerHTML = '';

  // Basic validation to check meaningful input
  const invalidPhrases = ['hi', 'hello', 'how are you', 'ok', 'hii', 'test'];
  const wordCount = content.split(/\s+/).length;

  if (
    content.length < 10 ||
    invalidPhrases.includes(content.toLowerCase()) ||
    wordCount < 4
  ) {
    resultContainer.innerHTML = '<p style="color: orange;">Please enter valid blog content with more context.</p>';
    return;
  }

  resultContainer.innerHTML = '<p>Generating titles...</p>';

  try {
    const response = await fetch('http://localhost:5000/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockContent: content, tone, style, maxChars, maxWords })
    });

    const data = await response.json();
    resultContainer.innerHTML = '';

    if (data.titles.length > 0) {
      data.titles.forEach(title => {
        const div = document.createElement('div');
        div.textContent = title;
        resultContainer.appendChild(div);
      });
      loadHistory(); // Refresh history
    } else {
      resultContainer.innerHTML = '<p style="color: orange;">No titles matched the criteria. Try increasing the limits.</p>';
    }

  } catch (error) {
    console.error(error);
    resultContainer.innerHTML = '<p style="color:red;">Error generating titles. Make sure the backend is running.</p>';
  }
}

async function loadHistory() {
  const historyContainer = document.getElementById('history');
  historyContainer.innerHTML = '<h3>Generated Titles History</h3>';

  try {
    const response = await fetch('http://localhost:5000/titles');
    const entries = await response.json();

    entries.forEach(entry => {
      const section = document.createElement('div');
      section.classList.add('topic-section');

      const topicHeading = document.createElement('h4');
      topicHeading.classList.add('topic-heading');
      topicHeading.textContent = `📝 Topic: ${entry.content.substring(0, 80)}${entry.content.length > 80 ? '...' : ''}`;
      section.appendChild(topicHeading);

      entry.titles.forEach((title, index) => {
        const item = document.createElement('div');
        item.classList.add('history-item');
        item.innerHTML = `
          <span class="history-title">${title}</span>
          <button class="delete-button" onclick="deleteSingleTitle('${entry._id}', ${index})">❌</button>
        `;
        section.appendChild(item);
      });

      historyContainer.appendChild(section);
    });
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

async function deleteSingleTitle(entryId, titleIndex) {
  try {
    await fetch(`http://localhost:5000/title/${entryId}/titleIndex/${titleIndex}`, {
      method: 'DELETE'
    });
    loadHistory();
  } catch (error) {
    console.error('Error deleting title:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadHistory);
