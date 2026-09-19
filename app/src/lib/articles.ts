/**
 * Bài viết tư vấn — nhóm nội dung trả lời đúng câu khách hay hỏi.
 *
 * Viết theo hướng cân bằng: nói thật cái hay của học trực tiếp rồi mới nói
 * chỗ online làm được. Bài một chiều kiểu "online hơn hẳn" vừa không đúng,
 * vừa bị người đọc lẫn công cụ AI coi là quảng cáo mà bỏ qua — còn bài thừa
 * nhận cả hai mặt thì mới được trích dẫn.
 *
 * Nội dung để dạng dữ liệu chứ không viết thẳng vào giao diện, để chủ trung
 * tâm sửa chữ mà không phải đụng tới mã.
 *
 * Trong phần chữ, `[chữ hiện](/đường-dẫn)` sẽ thành liên kết.
 */

export interface ArticleBlock {
  heading?: string;
  /** Mỗi phần tử là một đoạn văn. */
  paragraphs?: string[];
  /** Danh sách gạch đầu dòng. */
  list?: string[];
  /** Danh sách có thứ tự, dùng cho các mốc thời gian. */
  steps?: { label: string; text: string }[];
  /** Khung nhấn mạnh, cho câu chốt của cả mục. */
  callout?: string;
}

export interface Article {
  slug: string;
  /** Câu hỏi đúng như người ta gõ lên Google — cũng là tiêu đề trang. */
  question: string;
  /** Tiêu đề trên thẻ tìm kiếm, ngắn hơn câu hỏi. */
  title: string;
  description: string;
  /** Ngày sửa nội dung gần nhất, hiện cho người đọc và khai cho máy. */
  updated: string;
  /**
   * Câu trả lời thẳng, 2–4 câu, đặt ngay dưới tiêu đề.
   *
   * Đây là đoạn được trích nhiều nhất — cả Google lẫn công cụ AI đều lấy
   * đoạn trả lời trực tiếp chứ không lấy đoạn dẫn nhập. Viết sao cho tách
   * riêng ra vẫn là một câu trả lời hoàn chỉnh.
   */
  answer: string;
  blocks: ArticleBlock[];
  faq: { q: string; a: string }[];
  /** Đường dẫn tới trang thư viện liên quan. */
  related?: { path: string; label: string }[];
}

const UPDATED = "2026-09-19";

export const ARTICLES: Article[] = [
  // -------------------------------------------------------------------------
  {
    slug: "hoc-nhac-online-co-hieu-qua-khong",
    question: "Học nhạc online có hiệu quả bằng học trực tiếp không?",
    title: "Học nhạc online có hiệu quả không?",
    description:
      "So sánh thật giữa học nhạc online và học trực tiếp: chỗ nào học trực tiếp hơn hẳn, chỗ nào online làm tốt hơn, và ai thì không nên học online.",
    updated: UPDATED,
    answer:
      "Với người mới và người học để chơi cho vui, học nhạc online 1 kèm 1 đạt gần bằng học trực tiếp — miễn là đặt camera đúng chỗ và đường truyền ổn định. Học trực tiếp vẫn hơn ở vài điểm mà online khó thay thế được, nhưng online lại hơn ở tần suất và sự đều đặn. Mà với việc học nhạc, đều đặn mới là thứ quyết định kết quả.",
    blocks: [
      {
        heading: "Học trực tiếp hơn ở những chỗ này",
        paragraphs: [
          "Nói thẳng trước: có những thứ ngồi cạnh nhau làm được mà qua màn hình thì không.",
        ],
        list: [
          "Giáo viên chỉnh tư thế bằng tay. Đặt lại cổ tay, hạ vai, sửa góc ngón — qua màn hình phải mô tả bằng lời, chậm hơn và đôi khi học viên hiểu sai.",
          "Nghe được tiếng đàn thật. Micro và đường truyền đều nén âm thanh, nên những khác biệt tinh tế về sắc tiếng khó nhận ra. Với người học ở mức cao, đây là hạn chế thật.",
          "Chơi cùng nhau. Độ trễ đường truyền khiến hai người khó đàn đồng thời — hợp tấu hay đệm cho nhau gần như không làm được qua mạng.",
          "Trẻ nhỏ dễ mất tập trung. Trước màn hình, một đứa trẻ 5–6 tuổi cần người lớn ngồi cùng ít nhất thời gian đầu.",
        ],
      },
      {
        heading: "Online hơn ở những chỗ này",
        list: [
          "Không mất thời gian đi lại. Mỗi buổi tiết kiệm 30–60 phút cả đi lẫn về, chưa kể kẹt xe và trời mưa. Một tháng 8 buổi là tiết kiệm được 4–8 tiếng.",
          "Học đều hơn hẳn. Đây là điểm quan trọng nhất. Mưa, kẹt xe, bận việc đột xuất — những lý do khiến người ta bỏ buổi học trực tiếp gần như không còn.",
          "Chọn giáo viên không giới hạn địa lý. Không phải tìm người dạy giỏi ở gần nhà, mà tìm người hợp với mình ở bất kỳ đâu.",
          "Tập trên chính cây đàn của mình. Học ở trung tâm là quen tay với đàn trung tâm, về nhà đàn khác lại thấy lạ. Học online thì buổi học và buổi tự tập diễn ra trên cùng một cây đàn.",
          "Dễ ghi lại buổi học để xem lại chỗ chưa hiểu.",
        ],
      },
      {
        heading: "Thứ thật sự quyết định: tần suất, không phải hình thức",
        paragraphs: [
          "Học nhạc là xây phản xạ, mà phản xạ thì hình thành bằng lặp lại đều đặn chứ không bằng thời lượng dồn cục. Tập 20 phút mỗi ngày cho kết quả tốt hơn hẳn tập 2 tiếng rưỡi vào Chủ nhật, dù tổng thời gian bằng nhau.",
          "Chính ở đây online có lợi thế thật. Không phải vì buổi học online tốt hơn buổi học trực tiếp — mà vì nó dễ duy trì hơn, nên tổng số buổi thực sự diễn ra trong một năm thường nhiều hơn. Một khoá học trực tiếp chất lượng cao nhưng bỏ mất một phần ba số buổi vì lý do đi lại sẽ thua một khoá online đều đặn.",
        ],
        callout:
          "Không phải buổi học online hay hơn buổi học trực tiếp. Mà là buổi học online dễ diễn ra hơn — và buổi học không diễn ra thì chất lượng bao nhiêu cũng bằng không.",
      },
      {
        heading: "Ai không nên học online",
        paragraphs: ["Cũng phải nói thật phần này, kẻo học rồi mới thấy không hợp:"],
        list: [
          "Trẻ dưới 5 tuổi, trừ khi có ba mẹ ngồi cùng suốt buổi.",
          "Người học violin ở giai đoạn đầu. Tư thế cầm đàn và cách kéo vĩ phức tạp hơn hẳn các nhạc cụ khác, thời gian đầu được chỉnh trực tiếp sẽ nhanh hơn nhiều.",
          "Người cần cảm giác \"phải đến lớp\" mới chịu học. Online đòi hỏi tự giác hơn.",
          "Nhà chưa có nhạc cụ. Đây là điều kiện bắt buộc, không có cách nào thay thế.",
          "Đường truyền chập chờn. Giật hình vài lần một buổi là đủ làm hỏng cả buổi học.",
        ],
      },
      {
        heading: "Học online sao cho ra kết quả",
        paragraphs: [
          "Phần lớn trường hợp học online không hiệu quả là do sắp đặt sai chứ không phải do bản chất hình thức.",
        ],
        list: [
          "Đặt camera nhìn thấy TAY, không phải nhìn thấy mặt. Với guitar là góc chéo thấy cả hai tay; với piano là góc trên nhìn xuống bàn phím. Đây là thay đổi tạo khác biệt lớn nhất.",
          "Dùng tai nghe. Loa ngoài làm micro thu lại tiếng giáo viên, gây vọng và tự động giảm âm.",
          "Chuẩn bị sẵn đàn, giá nhạc, bút trước giờ học. Năm phút loay hoay là mất một phần mười buổi học.",
          "Bật sẵn máy trước 2–3 phút để kiểm tra tiếng và hình.",
          "Tập giữa các buổi. Buổi học chỉ để sửa sai và giao hướng; phần lớn tiến bộ đến từ những ngày ở giữa.",
        ],
      },
    ],
    faq: [
      {
        q: "Học đàn online có thật sự hiệu quả không?",
        a: "Có, với người mới và người học ở mức phổ thông, nếu học 1 kèm 1 và đặt camera nhìn được vào tay. Hạn chế thật của online nằm ở việc chỉnh tư thế bằng tay và chơi hợp tấu; đổi lại, online tiết kiệm thời gian đi lại và giúp giữ lịch học đều đặn hơn.",
      },
      {
        q: "Học online và học trực tiếp khác nhau thế nào?",
        a: "Học trực tiếp hơn ở chỗ giáo viên chỉnh tư thế bằng tay, nghe được tiếng đàn thật không qua nén, và chơi cùng nhau được. Học online hơn ở chỗ không mất thời gian đi lại, giữ lịch đều hơn, chọn được giáo viên không giới hạn địa lý, và học trên chính cây đàn ở nhà.",
      },
      {
        q: "Học nhạc online cần chuẩn bị gì?",
        a: "Cần nhạc cụ ở nhà, đường truyền ổn định, tai nghe, và một chỗ đặt camera nhìn được vào tay chứ không phải vào mặt. Với piano thì camera đặt phía trên nhìn xuống bàn phím; với guitar thì đặt chéo để thấy cả tay bấm lẫn tay gảy.",
      },
      {
        q: "Trẻ nhỏ học nhạc online được không?",
        a: "Từ khoảng 6 tuổi trở lên thường theo được, nhưng thời gian đầu nên có người lớn ngồi cùng để giữ tập trung. Dưới 5 tuổi thì học trực tiếp phù hợp hơn, vì trẻ ở tuổi đó khó duy trì chú ý qua màn hình.",
      },
    ],
    related: [
      { path: "/guitar", label: "Thư viện guitar miễn phí" },
      { path: "/piano", label: "Thư viện piano miễn phí" },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: "hoc-guitar-bao-lau-thi-dem-hat-duoc",
    question: "Học guitar bao lâu thì đệm hát được?",
    title: "Học guitar bao lâu thì đệm hát được?",
    description:
      "Các mốc thực tế khi học guitar đệm hát: tuần đầu làm gì, khi nào đệm được bài đầu tiên, cái gì làm chậm tiến độ và cách rút ngắn.",
    updated: UPDATED,
    answer:
      "Người tập đều 2 buổi học mỗi tuần và 15–20 phút mỗi ngày ở nhà thường đệm được bài đầu tiên sau 4–8 tuần, ở mức hát theo được trọn bài. Mốc quyết định không phải số buổi đã học mà là đổi hợp âm có mượt chưa: đổi được khoảng 60 lần một phút cho một cặp hợp âm là ghép vào bài được.",
    blocks: [
      {
        heading: "Các mốc thường gặp",
        paragraphs: [
          "Con số dưới đây tính cho người lớn hoặc thiếu niên bắt đầu từ con số 0, học 1 kèm 1 và có tập ở nhà. Tập ít hơn thì kéo dài ra theo tỉ lệ, chứ không phải không tới được.",
        ],
        steps: [
          { label: "Tuần 1–2", text: "Làm quen cây đàn, tư thế cầm, và 2–3 hợp âm dễ nhất như Em, Am, C. Giai đoạn này đầu ngón tay đau là bình thường, khoảng hai tuần là chai và hết." },
          { label: "Tuần 3–4", text: "Thêm G và D, bắt đầu tập đổi qua lại giữa từng cặp. Tập được một điệu quạt đơn giản: một nhát bass rồi ba nhát quạt xuống." },
          { label: "Tuần 5–8", text: "Đệm trọn được bài đầu tiên, thường là bài chỉ dùng bốn hợp âm. Còn vấp ở chỗ đổi hợp âm nhưng đã hát theo được từ đầu tới cuối." },
          { label: "Tháng 3–4", text: "Đổi hợp âm gần như không phải nghĩ. Biết thêm vài điệu, đệm được nhiều bài cùng vòng hợp âm mà không cần xem bản hợp âm." },
          { label: "Tháng 5–6", text: "Chặn được hợp âm F và B, tức là mở ra mọi tông. Nghe một bài lạ có thể đoán ra vòng hợp âm và đệm theo." },
        ],
      },
      {
        heading: "Mốc thật sự cần vượt qua",
        paragraphs: [
          "Người mới hay nghĩ khó nhất là nhớ thế bấm. Thực tế nhớ thế bấm chỉ mất vài buổi. Chỗ khiến gần như ai cũng mắc lại là ĐỔI hợp âm: bấm đúng C, bấm đúng G, nhưng chuyển từ C sang G thì mất hai nhịp, thế là bài nào cũng vấp đúng chỗ đổi.",
          "Vì vậy nên tách riêng việc này ra tập, đừng tập lẫn trong bài. Chọn hai hợp âm, bấm đổi qua lại liên tục trong một phút và đếm số lần. Người mới thường bắt đầu ở 15–25 lần; tới được 60 lần một phút thì việc đổi đã thành phản xạ và ghép vào bài là chơi được ngay.",
        ],
        callout:
          "Đừng đo tiến độ bằng số buổi đã học. Đo bằng số lần đổi hợp âm trong một phút — con số đó nói thật hơn nhiều.",
      },
      {
        heading: "Cái gì làm chậm tiến độ",
        list: [
          "Tập dồn cuối tuần. Hai tiếng ngày Chủ nhật thua xa 20 phút mỗi ngày, vì phản xạ hình thành bằng lặp lại đều chứ không bằng thời lượng.",
          "Học bài mới liên tục mà không tập chuyển hợp âm. Biết mười bài mà bài nào cũng vấp thì vẫn là chưa đệm được.",
          "Chọn bài quá khó ngay từ đầu. Bài có hợp âm chặn hoặc đổi hợp âm nửa nhịp sẽ làm nản trước khi kịp tiến bộ.",
          "Đàn để trong bao, cất trên tủ. Nghe nhỏ nhặt nhưng ảnh hưởng rất lớn — đàn treo sẵn ngoài tầm với thì ngày nào cũng cầm lên được vài phút.",
          "Bấm sai chỗ nên tiếng rè, tập mãi không sạch tiếng rồi nghĩ là mình không có khiếu.",
        ],
      },
      {
        heading: "Cách rút ngắn",
        list: [
          "Mỗi ngày 15 phút, chia làm hai: 5 phút tập đổi hợp âm, 10 phút ghép vào bài.",
          "Chọn bài chỉ có bốn hợp âm mở và đổi mỗi ô nhịp một lần.",
          "Học theo vòng hợp âm thay vì học từng bài. Nắm vòng 1-5-6-4 là đệm được rất nhiều bài cùng lúc.",
          "Tập với máy đếm nhịp ngay từ đầu, để chậm cũng được. Quen đều nhịp từ sớm thì sau đỡ phải sửa.",
          "Chưa chặn được F thì dùng tạm Fmaj7 bốn dây mỏng để chơi hết bài, rồi mỗi ngày tập chặn 5 phút riêng.",
        ],
      },
    ],
    faq: [
      {
        q: "Học guitar bao lâu thì đệm hát được một bài?",
        a: "Thường 4–8 tuần nếu học đều 2 buổi mỗi tuần và tập 15–20 phút mỗi ngày ở nhà. Bài đầu tiên thường là bài chỉ dùng bốn hợp âm mở, đệm ở mức hát theo được trọn bài dù còn vấp nhẹ ở chỗ đổi hợp âm.",
      },
      {
        q: "Mỗi ngày nên tập guitar bao nhiêu phút?",
        a: "15–20 phút mỗi ngày là đủ cho người mới, và hiệu quả hơn hẳn tập dồn 2 tiếng cuối tuần. Học nhạc là xây phản xạ, mà phản xạ hình thành bằng lặp lại đều đặn chứ không bằng thời lượng dồn cục.",
      },
      {
        q: "Vì sao đổi hợp âm mãi vẫn vấp?",
        a: "Vì tập đổi hợp âm lẫn trong bài chứ không tách ra tập riêng. Nên chọn hai hợp âm, đổi qua lại liên tục trong một phút và đếm số lần. Đạt khoảng 60 lần một phút thì việc đổi đã thành phản xạ.",
      },
      {
        q: "Bao lâu thì chặn được hợp âm F?",
        a: "Thường 1–3 tháng nếu tập khoảng 5 phút mỗi ngày. Chưa chặn được thì dùng tạm Fmaj7 chỉ bấm bốn dây mỏng để vẫn chơi hết bài — không cần dừng cả việc học lại chỉ vì một hợp âm.",
      },
    ],
    related: [
      { path: "/guitar/hop-am", label: "32 thế bấm hợp âm guitar" },
      { path: "/guitar/luyen-tap", label: "Bài tập đổi hợp âm 1 phút" },
      { path: "/guitar/vong-hoa-thanh", label: "Vòng hòa thanh guitar" },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: "be-may-tuoi-hoc-dan-duoc",
    question: "Bé mấy tuổi bắt đầu học đàn được?",
    title: "Bé mấy tuổi học đàn được?",
    description:
      "Độ tuổi phù hợp để bắt đầu học piano, guitar, violin và thanh nhạc, dựa trên yêu cầu thể chất và khả năng tập trung của từng lứa tuổi.",
    updated: UPDATED,
    answer:
      "Piano thường bắt đầu được từ 5–6 tuổi, violin từ 4–5 tuổi vì có đàn cỡ nhỏ, guitar muộn hơn khoảng 7–8 tuổi vì cần lực bấm dây, còn thanh nhạc nên đợi tới 7–8 tuổi. Điều quyết định không phải con số tuổi mà là ba dấu hiệu: bé ngồi yên được 20–30 phút, nghe và làm theo được chỉ dẫn, và tay đủ lớn cho nhạc cụ đó.",
    blocks: [
      {
        heading: "Từng nhạc cụ một",
        steps: [
          { label: "Piano — 5 đến 6 tuổi", text: "Là nhạc cụ dễ bắt đầu sớm nhất. Bấm phím không cần lực, không cần tạo âm bằng hơi hay bằng vĩ, nên bé bấm là ra tiếng ngay. Chỉ cần tay với được quãng năm phím trắng." },
          { label: "Violin — 4 đến 5 tuổi", text: "Có đàn cỡ nhỏ tới 1/16 nên bé rất nhỏ vẫn cầm được. Nhưng tư thế cầm đàn và cách kéo vĩ khó hơn hẳn, nên giai đoạn đầu cần kèm sát và nên học trực tiếp nếu có điều kiện." },
          { label: "Guitar — 7 đến 8 tuổi", text: "Phải đợi lâu hơn vì bấm dây cần lực ngón và ngón tay đủ dài để với các thế bấm. Bắt đầu quá sớm dễ làm bé nản vì bấm mãi không ra tiếng. Nếu muốn sớm hơn thì dùng đàn cỡ 1/2 hoặc 3/4 và chọn loại dây nylon mềm." },
          { label: "Thanh nhạc — 7 đến 8 tuổi", text: "Dây thanh của trẻ nhỏ còn đang phát triển nên không luyện kỹ thuật nặng được. Trước tuổi này chỉ nên hát chơi và tập cảm thụ nhịp điệu." },
        ],
      },
      {
        heading: "Ba dấu hiệu quan trọng hơn con số tuổi",
        paragraphs: [
          "Trẻ cùng tuổi chênh nhau rất nhiều. Thay vì đếm tuổi, nhìn ba điều này:",
        ],
        list: [
          "Ngồi yên được 20–30 phút với một việc. Nếu bé còn chưa ngồi hết một tập phim hoạt hình thì buổi học 60 phút sẽ là cực hình cho cả bé lẫn giáo viên.",
          "Nghe và làm theo được chỉ dẫn nhiều bước. Ví dụ \"đặt ngón trỏ vào đây, giữ nguyên, rồi bấm ngón giữa vào kia\".",
          "Tay đủ lớn cho nhạc cụ. Với piano là với được năm phím trắng liền nhau; với guitar là các ngón đủ dài để bấm mà không phải vặn cổ tay.",
        ],
        callout:
          "Bắt đầu sớm một năm không quan trọng bằng việc bé thấy vui và muốn học tiếp. Bắt đầu quá sớm rồi bỏ giữa chừng thường khiến bé ngại quay lại sau này.",
      },
      {
        heading: "Chưa tới tuổi thì làm gì",
        paragraphs: [
          "Với bé 3–5 tuổi, giai đoạn này nên xây nền cảm thụ chứ chưa nên học kỹ thuật:",
        ],
        list: [
          "Hát cùng bé, vỗ tay theo nhịp bài hát.",
          "Cho nghe nhiều loại nhạc khác nhau, không chỉ nhạc thiếu nhi.",
          "Chơi trò phân biệt tiếng cao tiếng thấp, tiếng to tiếng nhỏ, nhanh chậm.",
          "Cho bé gõ trống, lắc xúc xắc — bất cứ thứ gì tạo nhịp.",
        ],
      },
      {
        heading: "Người lớn bắt đầu có muộn không",
        paragraphs: [
          "Không. Người lớn học chậm hơn trẻ em ở khả năng nghe tuyệt đối và độ mềm dẻo của ngón tay, nhưng nhanh hơn hẳn ở khả năng hiểu lý thuyết, tự kỷ luật và biết mình muốn gì. Trẻ em cần ba tháng để hiểu vòng hợp âm là gì, người lớn hiểu trong một buổi.",
          "Với mục tiêu đệm hát cho vui — mục tiêu của phần lớn người học — thì tuổi bắt đầu gần như không ảnh hưởng tới kết quả. Người 40 tuổi tập đều vẫn đệm được bài sau vài tháng, y như người 20 tuổi.",
        ],
      },
    ],
    faq: [
      {
        q: "Bé mấy tuổi học piano được?",
        a: "Thường từ 5–6 tuổi. Piano là nhạc cụ dễ bắt đầu sớm nhất vì bấm phím là ra tiếng, không cần lực hay kỹ thuật tạo âm. Điều kiện là bé ngồi yên được khoảng 20–30 phút và tay với được năm phím trắng liền nhau.",
      },
      {
        q: "Bé mấy tuổi học guitar được?",
        a: "Thường từ 7–8 tuổi, muộn hơn piano vì bấm dây cần lực ngón và ngón tay phải đủ dài. Muốn cho học sớm hơn thì dùng đàn cỡ 1/2 hoặc 3/4 và chọn dây nylon mềm thay vì dây sắt.",
      },
      {
        q: "Trẻ 4 tuổi học nhạc được chưa?",
        a: "Violin có đàn cỡ nhỏ nên 4–5 tuổi học được, nhưng cần kèm sát. Với các nhạc cụ khác thì 4 tuổi thường còn sớm; giai đoạn này nên tập cảm thụ — hát cùng bé, vỗ tay theo nhịp, phân biệt tiếng cao thấp.",
      },
      {
        q: "Người lớn bắt đầu học nhạc có muộn không?",
        a: "Không muộn. Người lớn kém trẻ em ở độ mềm dẻo của ngón tay nhưng hơn hẳn ở khả năng hiểu lý thuyết và tự kỷ luật. Với mục tiêu đệm hát cho vui thì tuổi bắt đầu gần như không ảnh hưởng tới kết quả.",
      },
    ],
    related: [
      { path: "/piano", label: "Thư viện piano miễn phí" },
      { path: "/guitar", label: "Thư viện guitar miễn phí" },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: "khong-co-dan-co-hoc-duoc-khong",
    question: "Không có đàn ở nhà có học được không?",
    title: "Không có đàn ở nhà có học được không?",
    description:
      "Vì sao bắt buộc phải có nhạc cụ ở nhà, nên mua loại nào cho năm đầu, và những thứ không cần mua vội.",
    updated: UPDATED,
    answer:
      "Không. Phải có nhạc cụ ở nhà thì mới học được, vì phần lớn tiến bộ đến từ những ngày giữa các buổi học chứ không phải từ buổi học. Nhưng không cần đàn đắt: một cây đàn phổ thông là đủ dùng cho ít nhất một hai năm đầu, và có thể mua đàn cũ.",
    blocks: [
      {
        heading: "Vì sao không thể học chay",
        paragraphs: [
          "Mỗi tuần học 2 buổi là 2 tiếng; 166 tiếng còn lại mới là nơi ngón tay thật sự hình thành thói quen. Không có đàn ở nhà nghĩa là suốt tuần không chạm đàn, tới buổi sau lại bắt đầu gần như từ đầu. Sau vài tháng vẫn giẫm chân tại chỗ, rồi thường bỏ vì nghĩ mình không có khiếu.",
          "Đây là lý do rõ ràng nhất khiến người học bỏ giữa chừng, và cũng là thứ dễ khắc phục nhất.",
        ],
        callout:
          "Buổi học để sửa sai và giao hướng. Việc học thật sự diễn ra ở nhà, vào những ngày ở giữa.",
      },
      {
        heading: "Năm đầu nên mua gì",
        steps: [
          { label: "Guitar", text: "Người mới nên bắt đầu bằng guitar dây nylon (classic) vì dây mềm, đỡ đau tay hơn dây sắt. Nếu định đệm hát nhạc trẻ thì guitar dây sắt (acoustic) cho tiếng hợp hơn, nhưng chấp nhận hai tuần đầu đau ngón. Đàn phổ thông là đủ; quan trọng nhất là cần đàn không cong và dây không quá cao so với phím." },
          { label: "Piano", text: "Đàn điện (digital piano) là đủ cho người mới, không cần piano cơ. Cần nhất hai thứ: đủ 88 phím và phím có chạm nặng (weighted). Đàn organ phím nhẹ vẫn học được những buổi đầu nhưng sẽ phải tập lại lực ngón khi chuyển sang piano thật." },
          { label: "Violin", text: "Nên mua đúng cỡ theo chiều dài cánh tay, không mua rộng ra để dùng lâu — cỡ sai làm hỏng tư thế ngay từ đầu. Trẻ em sẽ phải đổi cỡ vài lần khi lớn, nên đây là nhạc cụ đáng cân nhắc mua cũ hoặc thuê." },
        ],
      },
      {
        heading: "Những thứ chưa cần mua vội",
        list: [
          "Đàn đắt tiền. Người mới chưa phân biệt được khác biệt về tiếng, mà lại chưa chắc theo lâu dài.",
          "Bộ hiệu ứng, ampli, micro thu âm — chỉ cần khi đã chơi được và muốn biểu diễn hoặc thu.",
          "Máy đếm nhịp rời. Dùng bản trên web hoặc điện thoại là đủ.",
          "Giá nhạc xịn. Loại rẻ nhất cũng dùng tốt.",
          "Sách dày. Giáo viên sẽ chỉ phần cần học; mua nguyên bộ thường để đó.",
        ],
      },
      {
        heading: "Trường hợp đặc biệt: thanh nhạc",
        paragraphs: [
          "Học hát thì không cần mua nhạc cụ — giọng là nhạc cụ rồi. Nhưng vẫn nên có một cây đàn phím bất kỳ, kể cả ứng dụng piano trên điện thoại, để lấy nốt chuẩn khi luyện quãng và kiểm tra xem mình hát có đúng cao độ không.",
        ],
      },
    ],
    faq: [
      {
        q: "Không có đàn có học nhạc được không?",
        a: "Không. Phần lớn tiến bộ đến từ việc tập ở nhà giữa các buổi học, nên không có nhạc cụ thì mỗi buổi học lại phải bắt đầu gần như từ đầu. Riêng thanh nhạc thì không cần nhạc cụ, chỉ nên có một cây đàn phím bất kỳ để lấy nốt chuẩn.",
      },
      {
        q: "Người mới nên mua đàn guitar loại nào?",
        a: "Guitar dây nylon (classic) nếu ưu tiên đỡ đau tay, guitar dây sắt (acoustic) nếu định đệm hát nhạc trẻ. Đàn phổ thông là đủ cho năm đầu; điều quan trọng hơn giá là cần đàn không cong và dây không cao quá so với phím, vì dây cao làm bấm rất nặng.",
      },
      {
        q: "Học piano có cần mua đàn piano cơ không?",
        a: "Không cần. Đàn điện đủ dùng cho người mới, miễn là có đủ 88 phím và phím có chạm nặng. Đàn organ phím nhẹ vẫn học được những buổi đầu nhưng sẽ phải tập lại lực ngón khi chuyển sang piano thật.",
      },
      {
        q: "Có nên mua đàn cũ không?",
        a: "Có, nhất là với violin cho trẻ em vì phải đổi cỡ khi bé lớn. Với guitar thì cần kiểm tra cần đàn có cong không và dây có cao quá không; với piano điện thì thử lần lượt từng phím xem có phím nào câm hoặc kêu khác không.",
      },
    ],
    related: [
      { path: "/guitar/hop-am", label: "Thế bấm hợp âm guitar" },
      { path: "/piano/ban-phim", label: "Nốt nằm ở phím nào trên piano" },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: "tu-hoc-guitar-tren-youtube",
    question: "Tự học guitar trên YouTube có ổn không?",
    title: "Tự học guitar trên YouTube được không?",
    description:
      "YouTube dạy được gì và không dạy được gì khi học guitar, những lỗi hay mắc khi tự học, và cách kết hợp cho đỡ tốn tiền.",
    updated: UPDATED,
    answer:
      "Ổn cho giai đoạn đầu và cho người tự giác — rất nhiều người đệm hát được mà chỉ học trên mạng. Hạn chế lớn nhất là không ai nhìn thấy bạn đang làm sai gì: video dạy đúng nhưng không biết bạn đang đặt cổ tay sai, mà thói quen sai càng tập lâu càng khó sửa.",
    blocks: [
      {
        heading: "YouTube làm tốt những việc này",
        list: [
          "Dạy kiến thức: hợp âm là gì, vòng hòa thanh là gì, điệu nào đánh thế nào.",
          "Cho xem nhiều cách chơi cùng một bài, nhiều phong cách khác nhau.",
          "Miễn phí và xem lại được bao nhiêu lần tuỳ thích.",
          "Học đúng lúc mình rảnh, không phải hẹn giờ với ai.",
        ],
      },
      {
        heading: "YouTube không làm được những việc này",
        paragraphs: [
          "Vấn đề không nằm ở chất lượng video — nhiều video dạy rất tốt. Vấn đề là chiều thông tin chỉ có một hướng.",
        ],
        list: [
          "Không ai nhìn thấy tay bạn. Cổ tay gập sai, ngón cái đặt quá cao, vai nhướng lên — những lỗi này bạn không tự thấy trong gương mà video cũng không thấy.",
          "Không biết bạn đang ở đâu. Video làm cho người xem trung bình, không biết bạn đã vững chỗ nào và hổng chỗ nào, nên hay dạy thứ bạn chưa tới hoặc thứ bạn đã biết.",
          "Không sửa được tiếng rè. Tiếng rè có nhiều nguyên nhân khác nhau — bấm xa ngăn, ngón chạm dây bên cạnh, lực không đủ — mà mỗi nguyên nhân sửa một kiểu. Tự đoán thường đoán sai.",
          "Không có ai chờ mình. Không hẹn với ai thì rất dễ bỏ ba tuần liền mà chẳng sao cả.",
        ],
        callout:
          "Thói quen sai tập càng lâu càng khó sửa. Sửa một lỗi tư thế ở tuần thứ hai mất năm phút; sửa chính lỗi đó ở tháng thứ sáu có thể mất vài tuần.",
      },
      {
        heading: "Ba lỗi hay gặp nhất khi tự học",
        steps: [
          { label: "Bấm giữa ô phím", text: "Đầu ngón phải đặt sát ngay phía sau thanh ngăn. Bấm vào giữa ô làm tiếng rè, mà người tự học thường kết luận là do mình yếu tay rồi bấm mạnh hơn — càng đau tay mà tiếng vẫn rè." },
          { label: "Ngón cái vắt qua cần đàn", text: "Ngón cái nên tựa sau cần, khoảng giữa. Vắt qua trên thì các ngón còn lại mất tầm với, và sau này gần như không chặn được hợp âm." },
          { label: "Tập không có nhịp", text: "Tự tập hay nhanh dần ở đoạn dễ và chậm lại ở đoạn khó mà không tự biết. Tới lúc đàn cùng người khác mới phát hiện mình không giữ được nhịp." },
        ],
      },
      {
        heading: "Cách kết hợp cho đỡ tốn",
        paragraphs: [
          "Không nhất thiết phải chọn một trong hai. Cách nhiều người dùng và khá hợp lý:",
        ],
        list: [
          "Học vài buổi đầu với giáo viên để lấy đúng tư thế và cách bấm, rồi tự tập theo video.",
          "Quay lại vài buổi mỗi khi thấy bí — thường là lúc tập mãi không qua được một chỗ nào đó.",
          "Dùng tài liệu tra cứu miễn phí cho phần kiến thức, dành tiền cho phần cần người nhìn và sửa.",
          "Nếu ngân sách hẹp, học thưa ra — mỗi tuần một buổi nhưng đều đặn vẫn tốt hơn học dồn rồi nghỉ hẳn.",
        ],
      },
    ],
    faq: [
      {
        q: "Tự học guitar trên YouTube có được không?",
        a: "Được, nhiều người đệm hát được mà chỉ học trên mạng. Nhưng YouTube không thấy được tay bạn, nên không phát hiện được lỗi tư thế — mà thói quen sai càng tập lâu càng khó sửa. Cách hợp lý là học vài buổi đầu với giáo viên để lấy đúng tư thế rồi tự tập theo video.",
      },
      {
        q: "Tự học guitar mất bao lâu?",
        a: "Thường lâu hơn có người hướng dẫn khoảng 1,5–2 lần, chủ yếu vì mất thời gian ở những chỗ bị mắc mà không biết mình sai chỗ nào. Người tự giác và có tai nhạc tốt thì khoảng cách này hẹp hơn.",
      },
      {
        q: "Vì sao tự học guitar hay bị tiếng rè?",
        a: "Ba nguyên nhân thường gặp: bấm vào giữa ô phím thay vì sát ngay sau thanh ngăn, ngón bấm chạm sang dây bên cạnh, và ngón chưa dựng đủ thẳng. Mỗi nguyên nhân sửa một kiểu, nên tự đoán thường đoán sai và tập mãi không hết.",
      },
    ],
    related: [
      { path: "/guitar/hop-am", label: "Tra thế bấm hợp âm" },
      { path: "/guitar/dieu-dem", label: "8 điệu đệm guitar" },
      { path: "/guitar/luyen-tap", label: "Game và bài tập luyện guitar" },
    ],
  },

  // -------------------------------------------------------------------------
  {
    slug: "nen-hoc-guitar-hay-piano-truoc",
    question: "Nên học guitar hay piano trước?",
    title: "Nên học guitar hay piano trước?",
    description:
      "So sánh guitar và piano cho người mới: cái nào ra bài nhanh hơn, cái nào dễ hiểu nhạc lý hơn, và chọn theo mục tiêu nào.",
    updated: UPDATED,
    answer:
      "Muốn nhanh chóng đệm hát cho vui thì chọn guitar — khoảng một hai tháng là đệm được bài đầu tiên, đàn lại rẻ và mang đi được. Muốn hiểu nhạc lý chắc và có nền để sau này học nhạc cụ khác thì chọn piano — vì các nốt xếp thẳng hàng nên nhìn là thấy cấu trúc, và tập được cả hai tay độc lập.",
    blocks: [
      {
        heading: "Guitar hơn ở chỗ nào",
        list: [
          "Ra bài nhanh hơn. Bốn hợp âm mở là đệm được rất nhiều bài, thường trong 4–8 tuần.",
          "Đàn rẻ hơn và mang đi được — đi chơi, đi cắm trại, sinh hoạt nhóm.",
          "Rất hợp để vừa đàn vừa hát, nên nếu mục tiêu là đệm hát thì đây là lựa chọn tự nhiên.",
          "Chiếm ít chỗ trong nhà.",
        ],
      },
      {
        heading: "Piano hơn ở chỗ nào",
        list: [
          "Nhìn là hiểu nhạc lý. Các nốt xếp thành hàng từ thấp tới cao, quãng và hợp âm hiện ra thành hình, nên dễ hình dung hơn hẳn so với sáu dây chồng chéo của guitar.",
          "Ra tiếng ngay từ phút đầu. Bấm phím là kêu, không phải học cách tạo âm, không đau tay, không có giai đoạn chai ngón.",
          "Tập được hai tay làm hai việc khác nhau — kỹ năng dùng được cho mọi nhạc cụ về sau.",
          "Nền tốt nhất để sau này học nhạc cụ khác, kể cả guitar. Người biết piano học guitar thường nhanh hơn chiều ngược lại.",
        ],
      },
      {
        heading: "Cái khó của mỗi bên",
        steps: [
          { label: "Guitar khó ở đầu", text: "Hai tuần đầu đau đầu ngón tay cho tới khi chai. Hợp âm chặn (F, B) là ngưỡng khiến nhiều người bỏ. Bù lại qua được giai đoạn này thì tiến rất nhanh." },
          { label: "Piano khó ở giữa", text: "Bắt đầu rất dễ chịu, nhưng tới lúc phải phối hợp hai tay làm hai việc khác nhau thì đó là ngưỡng thật sự. Cũng phải đọc hai khuông nhạc cùng lúc, khóa Sol cho tay phải và khóa Fa cho tay trái." },
        ],
      },
      {
        heading: "Chọn theo mục tiêu",
        steps: [
          { label: "Muốn đệm hát cho vui, càng sớm càng tốt", text: "Guitar." },
          { label: "Muốn hiểu nhạc lý, có nền lâu dài", text: "Piano." },
          { label: "Cho trẻ dưới 7 tuổi", text: "Piano, vì guitar cần lực bấm dây mà tay trẻ chưa đủ." },
          { label: "Nhà chật, hay đi lại", text: "Guitar." },
          { label: "Đã biết một nhạc cụ, muốn học thêm", text: "Chọn cái còn lại — hai nhạc cụ này bổ trợ cho nhau rất tốt." },
        ],
        callout:
          "Không có lựa chọn sai. Cái quyết định kết quả là bạn có thật sự thích tiếng của nhạc cụ đó hay không — vì đó là thứ khiến bạn cầm đàn lên mỗi ngày.",
      },
      {
        heading: "Học cả hai cùng lúc được không",
        paragraphs: [
          "Được, nhưng với người mới thì thường chậm hơn là học lần lượt. Hai nhạc cụ đòi hỏi hai kiểu vận động tay khác hẳn nhau, chia đôi thời gian tập thì cả hai đều lâu tới ngưỡng dùng được.",
          "Cách thường hiệu quả hơn: học một cái tới mức chơi được vài bài trọn vẹn — khoảng 6 tháng tới một năm — rồi mới thêm cái thứ hai. Lúc đó phần nhạc lý đã có sẵn, học cái thứ hai chỉ còn phải học phần kỹ thuật tay.",
        ],
      },
    ],
    faq: [
      {
        q: "Nên học guitar hay piano trước?",
        a: "Guitar nếu muốn đệm hát cho vui và ra bài nhanh — khoảng 4–8 tuần là đệm được bài đầu tiên. Piano nếu muốn hiểu nhạc lý chắc và có nền để học nhạc cụ khác về sau, vì các nốt xếp thẳng hàng nên cấu trúc nhạc hiện ra thành hình.",
      },
      {
        q: "Guitar và piano cái nào dễ hơn?",
        a: "Piano dễ hơn lúc bắt đầu vì bấm phím là ra tiếng ngay, không đau tay. Guitar khó ở hai tuần đầu khi ngón tay chưa chai và ở hợp âm chặn, nhưng qua được thì đệm hát được sớm hơn. Cái khó của piano đến muộn hơn, ở chỗ phối hợp hai tay làm hai việc khác nhau.",
      },
      {
        q: "Biết piano rồi học guitar có dễ hơn không?",
        a: "Có. Người biết piano đã nắm nhạc lý, đọc được nốt và hiểu hợp âm, nên học guitar chỉ còn phải học phần kỹ thuật tay. Chiều ngược lại cũng giúp nhưng ít hơn, vì guitar không buộc phải đọc nốt nhạc.",
      },
      {
        q: "Có nên học guitar và piano cùng lúc không?",
        a: "Với người mới thì thường chậm hơn học lần lượt, vì hai nhạc cụ đòi hỏi hai kiểu vận động tay khác hẳn nhau. Nên học một cái tới mức chơi trọn được vài bài, khoảng 6 tháng tới một năm, rồi mới thêm cái thứ hai.",
      },
    ],
    related: [
      { path: "/guitar", label: "Thư viện guitar miễn phí" },
      { path: "/piano", label: "Thư viện piano miễn phí" },
    ],
  },
];

/** Bài viết theo slug. */
export const ARTICLE_BY_SLUG = new Map(ARTICLES.map((a) => [a.slug, a]));

/** Địa chỉ của mọi bài viết, cho sitemap. */
export const ARTICLE_PATHS = ["/hoc-nhac", ...ARTICLES.map((a) => `/hoc-nhac/${a.slug}`)];
