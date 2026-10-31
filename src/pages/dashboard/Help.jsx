const QUESTIONS = [
  ['How do I generate a recipe?', 'Open Generate recipe, add your ingredients, choose any filters and select Generate recipe.'],
  ['How are allergies handled?', 'Add them in your Allergy profile. We check your ingredients and each recipe against that list, and block recipes that contain an allergen. We can\'t see inside packaged products, so always check labels yourself.'],
  ['Where do nutrition numbers come from?', 'They are AI estimates per serving, and may not be exact. Each recipe says when values are estimated.'],
  ['How do I track what I eat?', 'Select Log as eaten on a recipe. It then counts toward your dashboard, Nutrition tracker and Progress.'],
  ['Is this medical advice?', 'No. NutriChef AI gives general information only. Talk to a doctor or dietitian about your own health.'],
  ['Where is my data stored?', 'In this prototype, your data stays in this browser, except what is sent to the AI to write a recipe.'],
];

export default function Help() {
  return (
    <>
      <h1 className="dash-title">Help</h1>
      <div className="help-list">
        {QUESTIONS.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </>
  );
}
