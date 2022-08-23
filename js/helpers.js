const getMostVoted = (map) => {
	const maxVotes = Math.max(...Array.from(map.values()));
	return Array.from(map.entries()).find(([, val]) => val == maxVotes)[0];
};

const getTopThree = (map) => {
	const sortedEntries = Array.from(map.entries()).sort(([, valA], [, valB]) => {
		return valB - valA;
	});
	return sortedEntries.slice(0, 3).map(([key]) => key);
};

const getRandom = (map) => {
	const index = Math.floor(Math.random() * map.size);
	return Array.from(map.keys())[index];
};

export const getMatchupAnswer = (answerChoice, allAnswers) => {
	if (!allAnswers || !answerChoice) return;

	const answersArray = Object.entries(allAnswers)
		.filter(([key]) => key !== "allFoodOptions")
		.flatMap(([, value]) => value);
	const flattenedAnswers = new Map();

	answersArray.forEach((val) => {
		if (flattenedAnswers.get(val)) {
			flattenedAnswers.set(val, flattenedAnswers.get(val) + 1);
		} else {
			flattenedAnswers.set(val, 1);
		}
	});

	switch (answerChoice.toLowerCase()) {
		case "most voted":
			return getMostVoted(flattenedAnswers);
		case "top three":
			return getTopThree(flattenedAnswers);
		case "random":
			return getRandom(flattenedAnswers);
		default:
			return;
	}
};

export const removeDuplicates = (array) => [
	...new Map(array.map((item) => [item["id"], item])).values(),
];
